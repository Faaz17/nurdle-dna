#!/usr/bin/env python3
"""
NurdleDNA — Jetson Nano entry point
=====================================
Starts three background threads:
  1. VisionAgent   — camera capture + YOLOv8n / OpenCV inference
  2. SerialBridge  — bidirectional JSON protocol with Arduino
  3. CloudPublisher — Firebase Realtime Database publisher

The main thread polls vision at 5 Hz and forwards commands to Arduino.

Usage:
    python3 main.py

To run on boot (systemd):
    See README.md → "Auto-start on Jetson boot"
"""

import signal
import sys
import time

from vision        import VisionAgent
from serial_bridge import SerialBridge
from cloud         import CloudPublisher


VISION_SEND_INTERVAL = 0.2   # seconds — send to Arduino at 5 Hz


def main():
    print("=" * 52)
    print("  NurdleDNA Jetson Agent")
    print("  ECTE 250 Team 2 — Arc Tech, UOWD")
    print("=" * 52)

    vision = VisionAgent()
    bridge = SerialBridge()
    cloud  = CloudPublisher()

    # Start subsystems
    bridge.start()   # open serial first so Arduino is ready
    vision.start()   # start camera capture

    def get_state():
        """Aggregated state for the cloud publisher."""
        v_state, conf, count = vision.get()
        telemetry = bridge.get_telemetry()
        return v_state, telemetry, count, conf

    cloud.start(get_state, get_frame_fn=vision.get_frame)

    print("[main] All subsystems running. Press Ctrl+C to stop.\n")

    # ─── Main loop: forward vision results to Arduino at 5 Hz ────
    try:
        while True:
            v_state, conf, count = vision.get()
            bridge.send_command(v_state, conf, count)
            time.sleep(VISION_SEND_INTERVAL)

    except KeyboardInterrupt:
        print("\n[main] Shutdown requested — stopping subsystems...")

    finally:
        cloud.stop()
        vision.stop()
        bridge.stop()
        print("[main] Stopped cleanly.")
        sys.exit(0)


def _handle_sigterm(*_):
    raise KeyboardInterrupt


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, _handle_sigterm)
    main()
