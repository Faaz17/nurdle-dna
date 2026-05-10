"""
serial_bridge.py — Bidirectional JSON protocol between Jetson and Arduino.

Jetson  → Arduino (every 200 ms):
    {"state":"WARN|CRIT|CLEAR","confidence":0.85,"count":12}

Arduino → Jetson  (every 200 ms):
    {"fsm_state":"S1","valve":"OPEN","ldr":542,"gas":380,"load_g":3.4}
"""

import json
import threading
import time

import serial

from config import SERIAL_PORT, SERIAL_BAUD, SERIAL_TIMEOUT


_DEFAULT_TELEMETRY = {
    "fsm_state": "S1",
    "valve":     "OPEN",
    "ldr":       0,
    "gas":       0,
    "load_g":    0.0,
}


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
        try:
            self._serial = serial.Serial(
                SERIAL_PORT, SERIAL_BAUD,
                timeout=SERIAL_TIMEOUT
            )
            time.sleep(2)      # wait for Arduino bootloader to finish
            self.connected = True
            print(f"[serial] Connected: {SERIAL_PORT} @ {SERIAL_BAUD}")
        except serial.SerialException as exc:
            print(f"[serial] WARNING — could not open {SERIAL_PORT}: {exc}")
            print("[serial] Continuing in simulation mode (no Arduino output)")

        self._running = True
        self._thread  = threading.Thread(target=self._read_loop, name="serial", daemon=True)
        self._thread.start()

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

    def get_telemetry(self) -> dict:
        """Return a snapshot of the latest telemetry from the Arduino."""
        return dict(self.telemetry)

    # ─── Background read loop ────────────────────────────────────

    def _read_loop(self):
        buf = ""
        while self._running:
            if not self.connected:
                time.sleep(0.5)
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
            except serial.SerialException as exc:
                print("[serial] Read error:", exc)
                self.connected = False
                time.sleep(2)
                self._attempt_reconnect()

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
        print("[serial] Attempting reconnect...")
        try:
            if self._serial and self._serial.is_open:
                self._serial.close()
            self._serial = serial.Serial(
                SERIAL_PORT, SERIAL_BAUD, timeout=SERIAL_TIMEOUT
            )
            time.sleep(2)
            self.connected = True
            print("[serial] Reconnected")
        except serial.SerialException:
            print("[serial] Reconnect failed — retrying in 5 s")
            time.sleep(5)
