"""
cloud.py — Firebase Realtime Database publisher.

Writes to two paths:
  /devices/NURDLE-001      (latest snapshot, overwritten on every publish)
  /events/{push-key}       (immutable log entry, only on ALARM transitions)

Gracefully degrades if Firebase is not configured or unavailable.
"""

import base64
import collections
import collections.abc
import threading
import time
from datetime import datetime, timezone

# Python 3.10+ moved abc classes out of collections — patch all that pyrebase needs
for _name in ("Mapping", "MutableMapping", "Callable", "Sequence", "MutableSequence",
              "Set", "MutableSet", "Iterable", "Iterator"):
    if not hasattr(collections, _name):
        setattr(collections, _name, getattr(collections.abc, _name))

from config import (
    FIREBASE_CONFIG, DEVICE_ID, BAY_ID, HEARTBEAT_INTERVAL,
    STREAM_CAMERA, STREAM_INTERVAL, STREAM_WIDTH, STREAM_QUALITY,
)


# Seconds to suppress vision-derived alarms after a remote reset, so the
# dashboard reset visibly clears the alarm even with no Arduino attached.
# Matches the firmware's RESET_COOLDOWN_MS (5000 ms).
REMOTE_RESET_COOLDOWN = 5


def _iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class CloudPublisher:
    """Publishes device state and alarm events to Firebase."""

    def __init__(self):
        self._db       = None
        self._running  = False
        self._thread   = None
        self._get_state         = None
        self._get_frame_fn      = None
        self._get_breakdown_fn  = None
        self._send_reset_fn     = None    # forwards a dashboard reset to the Arduino
        self._reset_cooldown_until = 0.0  # suppress derived alarm after a remote reset
        self._last_heartbeat    = 0.0
        self._last_snapshot     = 0.0
        self._last_status       = "OK"
        self._first_snapshot_logged = False
        self._publish_count    = 0     # cumulative successful publishes
        self._last_publish_log = 0.0   # last time we logged a publish-success line

        if FIREBASE_CONFIG.get("apiKey", "REPLACE_ME") == "REPLACE_ME":
            print("[cloud] Firebase not configured — running offline (fill in config.py)")
            return

        try:
            import pyrebase
            app      = pyrebase.initialize_app(FIREBASE_CONFIG)
            self._db = app.database()
            print("[cloud] Firebase connected →", FIREBASE_CONFIG["databaseURL"])
            # Clear any stale dashboard command so we don't fire a reset on boot.
            try:
                self._db.child("devices").child(DEVICE_ID).child("command").remove()
            except Exception:
                pass
        except Exception as exc:
            print("[cloud] Firebase init failed:", exc)

    # ─── Public API ──────────────────────────────────────────────

    def start(self, get_state_fn, get_frame_fn=None, get_breakdown_fn=None,
              send_reset_fn=None):
        """
        get_state_fn() must return:
            (vision_state: str, telemetry: dict, count: int, confidence: float)
        get_frame_fn() optionally returns the latest annotated BGR frame, or None.
        get_breakdown_fn() optionally returns a {class_name: count} dict.
        send_reset_fn() optionally forwards a dashboard reset to the Arduino.
        """
        self._get_state        = get_state_fn
        self._get_frame_fn     = get_frame_fn
        self._get_breakdown_fn = get_breakdown_fn
        self._send_reset_fn    = send_reset_fn
        self._running          = True
        self._thread           = threading.Thread(target=self._loop, name="cloud", daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    # ─── Background loop ─────────────────────────────────────────

    def _loop(self):
        while self._running:
            try:
                self._tick()
            except Exception as exc:
                print("[cloud] Unexpected error:", exc)
            time.sleep(1)

    def _tick(self):
        vision_state, telemetry, count, confidence = self._get_state()
        now = time.time()

        # Handle a dashboard reset request before computing state this tick.
        self._check_remote_reset()

        arduino_fsm = telemetry.get("fsm_state")
        if arduino_fsm and arduino_fsm not in ("", "S0"):
            fsm = arduino_fsm                     # Real Arduino state wins
        elif now < self._reset_cooldown_until:
            # Remote reset just issued and no Arduino to latch — force CLEAR so
            # the dashboard alarm visibly resets even in simulation mode.
            fsm = "S1"
        else:
            # No Arduino — derive FSM from vision so the website still escalates
            fsm = {"CRIT": "S3", "WARN": "S2", "CLEAR": "S1"}.get(vision_state, "S1")

        valve  = telemetry.get("valve",     "OPEN")
        if not telemetry.get("fsm_state"):
            valve = "CLOSED" if fsm == "S3" else "OPEN"
        ldr    = telemetry.get("ldr",       0)
        gas    = telemetry.get("gas",       0)
        load_g = telemetry.get("load_g",    0.0)

        status        = _fsm_to_status(fsm)
        density_index = min(100, count * 7)

        ai_classes = (self._get_breakdown_fn() if self._get_breakdown_fn else {}) or {}

        payload = {
            "timestamp":     _iso_now(),
            "device_id":     DEVICE_ID,
            "bay_id":        BAY_ID,
            "fsm_state":     fsm,
            "valve":         valve,
            "ldr":           ldr,
            "gas_ppm":       gas,
            "load_g":        round(float(load_g), 2),
            "density_index": density_index,
            "status":        status,
            "ai_state":      vision_state,
            "ai_count":      count,
            "ai_confidence": round(float(confidence), 2),
            "ai_classes":    ai_classes,
        }

        changed_status   = (status != self._last_status)
        heartbeat_due    = (now - self._last_heartbeat) >= HEARTBEAT_INTERVAL

        if changed_status or heartbeat_due:
            self._publish_device(payload)
            self._last_heartbeat = now

        # Log immutable event entry on every ALARM entry
        if status == "ALARM" and self._last_status != "ALARM":
            self._push_event(payload)

        self._last_status = status

        # Publish camera snapshot at STREAM_INTERVAL cadence
        if STREAM_CAMERA and (now - self._last_snapshot) >= STREAM_INTERVAL:
            self._publish_snapshot()
            self._last_snapshot = now

    # ─── Dashboard → device commands ─────────────────────────────

    def _check_remote_reset(self):
        """Poll /devices/<id>/command/reset; act on a dashboard reset request.

        The website writes a timestamp there when the operator clicks Reset.
        We forward it to the Arduino (real latch clear), start a local cooldown
        (so sim-mode alarms also clear), then remove the flag so it fires once.
        """
        if not self._db:
            return
        try:
            req = (self._db.child("devices").child(DEVICE_ID)
                       .child("command").child("reset").get().val())
        except Exception:
            return

        if not req:
            return

        print("[cloud] Remote reset requested from dashboard")
        if self._send_reset_fn:
            self._send_reset_fn()                       # clear a real latched alarm
        self._reset_cooldown_until = time.time() + REMOTE_RESET_COOLDOWN

        try:
            (self._db.child("devices").child(DEVICE_ID)
                 .child("command").child("reset").remove())
        except Exception:
            pass

    # ─── Firebase writes ─────────────────────────────────────────

    def _publish_device(self, payload: dict):
        if not self._db:
            _print_offline(payload)
            return
        try:
            self._db.child("devices").child(DEVICE_ID).set(payload)
            self._publish_count += 1
            now = time.time()
            if self._publish_count == 1:
                print(f"[cloud] First publish OK → {payload['status']} "
                      f"(FSM={payload['fsm_state']})")
                self._last_publish_log = now
            elif now - self._last_publish_log >= 30.0:
                print(f"[cloud] Publishing OK "
                      f"({self._publish_count} writes total, "
                      f"FSM={payload['fsm_state']})")
                self._last_publish_log = now
        except Exception as exc:
            print("[cloud] Publish error:", exc)

    def _publish_snapshot(self):
        """Encode the latest annotated frame and write it to Firebase."""
        if not self._db or not self._get_frame_fn:
            return
        frame = self._get_frame_fn()
        if frame is None:
            return

        try:
            import cv2   # local import — only needed when streaming
            h, w = frame.shape[:2]
            new_w = STREAM_WIDTH
            new_h = max(1, int(round(h * (new_w / w))))
            small = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)
            ok, buf = cv2.imencode(".jpg", small,
                                   [cv2.IMWRITE_JPEG_QUALITY, STREAM_QUALITY])
            if not ok:
                return
            b64 = base64.b64encode(buf.tobytes()).decode("ascii")
            self._db.child("devices").child(DEVICE_ID).child("snapshot").set({
                "data":      b64,
                "timestamp": _iso_now(),
                "width":     new_w,
                "height":    new_h,
            })
            if not self._first_snapshot_logged:
                print(f"[cloud] First snapshot published "
                      f"({new_w}x{new_h}, ~{len(b64) // 1024} KB)")
                self._first_snapshot_logged = True
        except Exception as exc:
            print("[cloud] Snapshot publish error:", exc)

    def _push_event(self, payload: dict):
        if not self._db:
            return
        try:
            self._db.child("events").push({
                "timestamp":     payload["timestamp"],
                "device_id":     DEVICE_ID,
                "bay_id":        BAY_ID,
                "type":          "ALARM",
                "fsm_state":     payload["fsm_state"],
                "density_index": payload["density_index"],
                "gas_ppm":       payload["gas_ppm"],
                "load_g":        payload["load_g"],
                "ai_count":      payload["ai_count"],
            })
            print("[cloud] ALARM event logged")
        except Exception as exc:
            print("[cloud] Event push error:", exc)


def _fsm_to_status(fsm: str) -> str:
    return {"S3": "ALARM", "S2": "WARN"}.get(fsm, "OK")


def _print_offline(payload: dict):
    """Print payload locally when Firebase is not available."""
    print(f"[cloud offline] {payload['timestamp']} | {payload['status']} | "
          f"FSM={payload['fsm_state']} density={payload['density_index']} "
          f"gas={payload['gas_ppm']} load={payload['load_g']}g")
