"""
vision.py — Camera capture + nurdle detection

Detection priority:
  1. YOLOv8n ONNX via onnxruntime  (lightweight, no torch/ultralytics needed)
  2. OpenCV HSV fallback            (classical, works with no model file)
"""

import threading
import time

import cv2
import numpy as np

from config import (
    CAMERA_INDEX, YOLO_MODEL,
    YOLO_CONF, YOLO_IOU,
    COUNT_WARN, COUNT_CRIT,
)

# YOLOv8 ONNX input size (model was exported at 640×640)
_INFER_SIZE = 640


class VisionAgent:
    """Continuous camera inference; thread-safe .get() for latest result."""

    def __init__(self):
        self.count      = 0
        self.confidence = 0.0
        self.state      = "CLEAR"
        self.frame      = None

        self._lock     = threading.Lock()
        self._running  = False
        self._session  = None   # onnxruntime InferenceSession
        self._inp_name = None
        self._use_yolo = False
        self._cap      = None
        self._thread   = None

        self._try_load_onnx()

    # ─── Public API ──────────────────────────────────────────────

    def start(self):
        self._running = True
        self._cap = cv2.VideoCapture(CAMERA_INDEX)
        if not self._cap.isOpened():
            print("[vision] WARNING: could not open camera index", CAMERA_INDEX)
        self._thread = threading.Thread(target=self._loop, name="vision", daemon=True)
        self._thread.start()
        print("[vision] Started —", "YOLOv8 ONNX" if self._use_yolo else "OpenCV HSV fallback")

    def stop(self):
        self._running = False
        if self._cap:
            self._cap.release()

    def get(self):
        """Return (state, confidence, count) — thread-safe snapshot."""
        with self._lock:
            return self.state, self.confidence, self.count

    # ─── Model loading ───────────────────────────────────────────

    def _try_load_onnx(self):
        import os
        if not YOLO_MODEL:
            print("[vision] YOLO_MODEL is None — using OpenCV fallback")
            return
        if not os.path.exists(YOLO_MODEL):
            print(f"[vision] Model not found at '{YOLO_MODEL}' — using OpenCV fallback")
            return
        try:
            import onnxruntime as ort
            sess_opts = ort.SessionOptions()
            sess_opts.log_severity_level = 3   # suppress onnxruntime noise
            self._session  = ort.InferenceSession(
                YOLO_MODEL,
                sess_options=sess_opts,
                providers=["CPUExecutionProvider"],
            )
            self._inp_name = self._session.get_inputs()[0].name
            self._use_yolo = True
            print(f"[vision] YOLOv8 ONNX loaded: {YOLO_MODEL}")
        except Exception as exc:
            print(f"[vision] onnxruntime load error: {exc} — using OpenCV fallback")

    # ─── Inference loop ──────────────────────────────────────────

    def _loop(self):
        while self._running:
            ret, frame = self._cap.read()
            if not ret:
                time.sleep(0.05)
                continue

            if self._use_yolo:
                count, conf, annotated = self._infer_onnx(frame)
            else:
                count, conf, annotated = self._infer_hsv(frame)

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

    # ─── YOLOv8 ONNX inference ───────────────────────────────────

    def _infer_onnx(self, frame):
        h, w = frame.shape[:2]

        # Pre-process: BGR→RGB, resize, normalise, NCHW
        img = cv2.resize(frame, (_INFER_SIZE, _INFER_SIZE))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        inp = img.transpose(2, 0, 1)[np.newaxis]   # [1, 3, 640, 640]

        # Inference
        raw = self._session.run(None, {self._inp_name: inp})[0]  # [1, 4+nc, 8400]

        # YOLOv8 output: [batch, 4+nc, anchors] → transpose → [anchors, 4+nc]
        preds = raw[0].T   # [8400, 4+nc]

        scores      = preds[:, 4:]
        confidences = scores.max(axis=1)
        class_ids   = scores.argmax(axis=1)

        # Confidence filter
        keep = confidences >= YOLO_CONF
        if not keep.any():
            return 0, 0.0, frame.copy()

        preds_k = preds[keep]
        confs_k = confidences[keep]

        # cx,cy,w,h (in 640-px space) → x1,y1,w,h (in original frame space)
        sx, sy = w / _INFER_SIZE, h / _INFER_SIZE
        cx = preds_k[:, 0] * sx
        cy = preds_k[:, 1] * sy
        bw = preds_k[:, 2] * sx
        bh = preds_k[:, 3] * sy
        x1 = cx - bw / 2
        y1 = cy - bh / 2

        boxes_xywh = np.stack([x1, y1, bw, bh], axis=1)

        # NMS
        indices = cv2.dnn.NMSBoxes(
            boxes_xywh.tolist(), confs_k.tolist(), YOLO_CONF, YOLO_IOU
        )
        if len(indices) == 0:
            return 0, 0.0, frame.copy()

        indices = np.array(indices).flatten()
        count   = len(indices)
        conf    = float(confs_k[indices].max())

        # Annotate
        annotated = frame.copy()
        for i in indices:
            bx, by, bw_i, bh_i = boxes_xywh[i]
            x2i, y2i = int(bx + bw_i), int(by + bh_i)
            cv2.rectangle(annotated, (int(bx), int(by)), (x2i, y2i), (0, 255, 200), 2)
            cv2.putText(annotated, f"{confs_k[i]:.2f}",
                        (int(bx), max(0, int(by) - 5)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 200), 1)
        cv2.putText(annotated, f"Nurdles: {count}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 200), 2)

        return count, conf, annotated

    # ─── OpenCV HSV fallback ─────────────────────────────────────

    def _infer_hsv(self, frame):
        hsv  = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, (0, 0, 170), (180, 50, 255))
        k    = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,  k)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k)

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        pellets = [c for c in contours if 50 < cv2.contourArea(c) < 2000]
        count   = len(pellets)
        conf    = min(1.0, count / max(COUNT_CRIT, 1))

        annotated = frame.copy()
        for c in pellets:
            (x, y), r = cv2.minEnclosingCircle(c)
            cv2.circle(annotated, (int(x), int(y)), int(r) + 2, (0, 255, 200), 2)
        cv2.putText(annotated, f"Nurdles: {count}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 200), 2)

        return count, conf, annotated
