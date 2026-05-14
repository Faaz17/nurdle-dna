"""
cloud.py — Firebase Realtime Database publisher.

Writes to two paths:
  /devices/NURDLE-001      (latest snapshot, overwritten on every publish)
  /events/{push-key}       (immutable log entry, only on ALARM transitions)

Gracefully degrades if Firebase is not configured or unavailable.
"""

import collections
import collections.abc
import threading
import time
from datetime import datetime, timezone

# Python 3.10+ removed collections.MutableMapping — pyrebase still uses the old path
if not hasattr(collections, "MutableMapping"):
    collections.MutableMapping = collections.abc.MutableMapping

from config import FIREBASE_CONFIG, DEVICE_ID, BAY_ID, HEARTBEAT_INTERVAL


def _iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class CloudPublisher:
    """Publishes device state and alarm events to Firebase."""

    def __init__(self):
        self._db       = None
        self._running  = False
        self._thread   = None
        self._get_state = None
        self._last_heartbeat   = 0.0
        self._last_status      = "OK"

        if FIREBASE_CONFIG.get("apiKey", "REPLACE_ME") == "REPLACE_ME":
            print("[cloud] Firebase not configured — running offline (fill in config.py)")
            return

        try:
            import pyrebase
            app      = pyrebase.initialize_app(FIREBASE_CONFIG)
            self._db = app.database()
            print("[cloud] Firebase connected →", FIREBASE_CONFIG["databaseURL"])
        except Exception as exc:
            print("[cloud] Firebase init failed:", exc)

    # ─── Public API ──────────────────────────────────────────────

    def start(self, get_state_fn):
        """
        get_state_fn() must return:
            (vision_state: str, telemetry: dict, count: int, confidence: float)
        """
        self._get_state = get_state_fn
        self._running   = True
        self._thread    = threading.Thread(target=self._loop, name="cloud", daemon=True)
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

        fsm    = telemetry.get("fsm_state", "S1")
        valve  = telemetry.get("valve",     "OPEN")
        ldr    = telemetry.get("ldr",       0)
        gas    = telemetry.get("gas",       0)
        load_g = telemetry.get("load_g",    0.0)

        status        = _fsm_to_status(fsm)
        density_index = min(100, count * 7)

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

    # ─── Firebase writes ─────────────────────────────────────────

    _first_publish_logged = False

    def _publish_device(self, payload: dict):
        if not self._db:
            _print_offline(payload)
            return
        try:
            self._db.child("devices").child(DEVICE_ID).set(payload)
            if not self._first_publish_logged:
                print(f"[cloud] First publish OK → {payload['status']} "
                      f"(FSM={payload['fsm_state']})")
                self._first_publish_logged = True
        except Exception as exc:
            print("[cloud] Publish error:", exc)

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
