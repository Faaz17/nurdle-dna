"""
vision.py — Camera capture + nurdle detection
Runs on a background daemon thread; use .get() to read latest result.

Detection priority:
  1. YOLOv8n ONNX model  (requires ultralytics, fast on Jetson TensorRT)
  2. OpenCV HSV fallback  (classical, works with no model file)
"""

import threading
import time

import cv2

from config import (
    CAMERA_INDEX, YOLO_MODEL,
    YOLO_CONF, YOLO_IOU,
    COUNT_WARN, COUNT_CRIT,
)


class VisionAgent:
    """Continuous camera inference; thread-safe .get() for latest result."""

    def __init__(self):
        self.count      = 0
        self.confidence = 0.0
        self.state      = "CLEAR"
        self.frame      = None        # latest annotated frame (for debug stream)

        self._lock    = threading.Lock()
        self._running = False
        self._model   = None
        self._cap     = None
        self._thread  = None
        self._use_yolo = False

        self._try_load_yolo()

    # ─── Public API ──────────────────────────────────────────────

    def start(self):
        self._running = True
        self._cap = cv2.VideoCapture(CAMERA_INDEX)
        if not self._cap.isOpened():
            print("[vision] WARNING: could not open camera index", CAMERA_INDEX)
        self._thread = threading.Thread(target=self._loop, name="vision", daemon=True)
        self._thread.start()
        print("[vision] Started —", "YOLOv8" if self._use_yolo else "OpenCV HSV fallback")

    def stop(self):
        self._running = False
        if self._cap:
            self._cap.release()

    def get(self):
        """Return (state, confidence, count) — thread-safe snapshot."""
        with self._lock:
            return self.state, self.confidence, self.count

    # ─── Internal ────────────────────────────────────────────────

    def _try_load_yolo(self):
        if not YOLO_MODEL:
            print("[vision] YOLO_MODEL is None — using OpenCV fallback")
            return
        import os
        if not os.path.exists(YOLO_MODEL):
            print(f"[vision] Model not found at '{YOLO_MODEL}' — using OpenCV fallback")
            return
        try:
            from ultralytics import YOLO
            self._model   = YOLO(YOLO_MODEL)
            self._use_yolo = True
            print("[vision] YOLOv8 model loaded:", YOLO_MODEL)
        except Exception as exc:
            print("[vision] YOLOv8 load error:", exc, "— using OpenCV fallback")

    def _loop(self):
        while self._running:
            ret, frame = self._cap.read()
            if not ret:
                time.sleep(0.1)
                continue

            if self._use_yolo:
                count, conf, annotated = self._infer_yolo(frame)
            else:
                count, conf, annotated = self._infer_opencv(frame)

            state = (
                "CRIT" if count >= COUNT_CRIT else
                "WARN" if count >= COUNT_WARN else
                "CLEAR"
            )

            with self._lock:
                self.count      = count
                self.confidence = conf
                self.state      = state
                self.frame      = annotated

    # ─── YOLOv8 inference ────────────────────────────────────────

    def _infer_yolo(self, frame):
        results = self._model(frame, conf=YOLO_CONF, iou=YOLO_IOU, verbose=False)
        boxes   = results[0].boxes
        count   = len(boxes)
        conf    = float(boxes.conf.max()) if count > 0 else 0.0
        annotated = results[0].plot()
        return count, conf, annotated

    # ─── OpenCV HSV fallback ─────────────────────────────────────

    def _infer_opencv(self, frame):
        """
        Detect white/translucent pellets using HSV thresholding.
        Works best with a UV LED illuminating the flow cell — nurdles
        fluoresce slightly, making them stand out against the water.
        """
        hsv  = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

        # White/near-white pellets: low saturation, high value
        mask = cv2.inRange(hsv, (0, 0, 170), (180, 50, 255))

        # Morphological clean-up
        k    = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,  k)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k)

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Filter by area — nurdles ~3–8 mm, at ~30 cm distance ≈ 50–2000 px²
        pellets = [c for c in contours if 50 < cv2.contourArea(c) < 2000]
        count   = len(pellets)
        conf    = min(1.0, count / max(COUNT_CRIT, 1))

        # Annotate for debug
        annotated = frame.copy()
        for c in pellets:
            (x, y), r = cv2.minEnclosingCircle(c)
            cv2.circle(annotated, (int(x), int(y)), int(r) + 2, (0, 255, 200), 2)
        cv2.putText(annotated, f"Nurdles: {count}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 200), 2)

        return count, conf, annotated
