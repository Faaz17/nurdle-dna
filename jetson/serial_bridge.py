"""
serial_bridge.py — Bidirectional JSON protocol between Jetson and Arduino.

Jetson  → Arduino (every 200 ms):
    {"state":"WARN|CRIT|CLEAR","confidence":0.85,"count":12}

Arduino → Jetson  (every 200 ms):
    {"fsm_state":"S1","valve":"OPEN","ldr":542,"gas":380,"load_g":3.4}
"""

import glob
import json
import threading
import time

import serial

from config import SERIAL_PORT, SERIAL_BAUD, SERIAL_TIMEOUT


_DEFAULT_TELEMETRY = {
    # fsm_state and valve default to None so cloud.py can detect "no Arduino"
    # and derive FSM/valve from the vision pipeline instead.
    "fsm_state": None,
    "valve":     None,
    "ldr":       0,
    "gas":       0,
    "load_g":    0.0,
}


def _candidate_ports():
    """Ports to try, in order: the configured one first, then any ACM/USB
    serial devices present. Makes the link self-heal across boards that
    enumerate as /dev/ttyACM* (Uno) vs /dev/ttyUSB* (Nano clone)."""
    ordered = [SERIAL_PORT] + sorted(glob.glob("/dev/ttyACM*")) + sorted(glob.glob("/dev/ttyUSB*"))
    seen = []
    for p in ordered:
        if p and p not in seen:
            seen.append(p)
    return seen


class SerialBridge:
    """Thread-safe serial link to the Arduino."""

    def __init__(self):
        self._serial   = None
        self._lock     = threading.Lock()
        self._running  = False
        self._thread   = None
        self.telemetry = dict(_DEFAULT_TELEMETRY)
        self.connected = False

    # ─── Public API ──────────────────────────────────────────────

    def start(self):
        port = self._open_first_available()
        if port:
            time.sleep(2)      # wait for Arduino bootloader to finish
            self.connected = True
            print(f"[serial] Connected: {port} @ {SERIAL_BAUD}")
        else:
            print(f"[serial] WARNING — no Arduino found on {_candidate_ports()}")
            print("[serial] Continuing in simulation mode (no Arduino output)")

        self._running = True
        self._thread  = threading.Thread(target=self._read_loop, name="serial", daemon=True)
        self._thread.start()

    def _open_first_available(self):
        """Try each candidate port; on success store the Serial and return the
        port name, else return None. Does NOT sleep for the bootloader — the
        caller decides whether to wait."""
        for port in _candidate_ports():
            try:
                self._serial = serial.Serial(port, SERIAL_BAUD, timeout=SERIAL_TIMEOUT)
                return port
            except (serial.SerialException, OSError):
                continue
        return None

    def stop(self):
        self._running = False
        if self._serial and self._serial.is_open:
            self._serial.close()

    def send_command(self, state: str, confidence: float, count: int):
        """Send vision result to Arduino (non-blocking)."""
        if not self.connected or not self._serial or not self._serial.is_open:
            return
        msg = json.dumps({
            "state":      state,
            "confidence": round(confidence, 2),
            "count":      count,
        }) + "\n"
        try:
            with self._lock:
                self._serial.write(msg.encode("ascii"))
        except serial.SerialException as exc:
            print("[serial] Send error:", exc)

    def send_reset(self) -> bool:
        """Send a soft-reset command to clear a latched S3 alarm.

        Mirrors the physical RST button. Returns True if it was written to a
        connected Arduino, False in simulation mode (no serial link).
        """
        if not self.connected or not self._serial or not self._serial.is_open:
            return False
        msg = json.dumps({"state": "RESET"}) + "\n"
        try:
            with self._lock:
                self._serial.write(msg.encode("ascii"))
            print("[serial] RESET command sent to Arduino")
            return True
        except serial.SerialException as exc:
            print("[serial] Reset send error:", exc)
            return False

    def get_telemetry(self) -> dict:
        """Return a snapshot of the latest telemetry from the Arduino."""
        return dict(self.telemetry)

    # ─── Background read loop ────────────────────────────────────

    def _read_loop(self):
        buf = ""
        while self._running:
            if not self.connected:
                # Keep retrying connection forever — Arduino may have been
                # unplugged then replugged (USB enumeration takes a few s).
                self._attempt_reconnect()
                if not self.connected:
                    time.sleep(5)
                continue
            try:
                waiting = self._serial.in_waiting
                if waiting:
                    buf += self._serial.read(waiting).decode("ascii", errors="ignore")
                    while "\n" in buf:
                        line, buf = buf.split("\n", 1)
                        self._parse(line.strip())
                else:
                    time.sleep(0.02)
            except (serial.SerialException, OSError) as exc:
                print("[serial] Read error:", exc)
                self.connected = False
                # next loop iteration will trigger _attempt_reconnect

    def _parse(self, line: str):
        if not line:
            return
        try:
            data = json.loads(line)
            # Only accept known keys to avoid noise
            allowed = set(_DEFAULT_TELEMETRY.keys())
            filtered = {k: v for k, v in data.items() if k in allowed}
            self.telemetry.update(filtered)
        except (json.JSONDecodeError, ValueError):
            pass    # silently skip malformed lines

    def _attempt_reconnect(self):
        try:
            if self._serial and self._serial.is_open:
                self._serial.close()
        except Exception:
            pass
        port = self._open_first_available()
        if port:
            time.sleep(2)   # wait for Arduino bootloader
            self.connected = True
            print(f"[serial] (Re)connected: {port}")
        # else: stay quiet — initial failure was already printed
