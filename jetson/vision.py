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

try:
    from config import HYBRID_HSV
except ImportError:
    HYBRID_HSV = False

# YOLOv8 ONNX input size (model was exported at 640×640)
_INFER_SIZE = 640

# ─── Annotation styling (BGR colours, match website teal theme) ──
_TEAL    = (223, 243, 91)    # #5bf3df — primary accent
_AMBER   = (102, 209, 255)   # #ffd166 — emphasis
_DARK    = (45, 30, 18)      # background for label pills
_BRACKET = 28                # corner-bracket length for ROI box (px)


def _draw_roi_brackets(img, x1, y1, x2, y2, colour=_TEAL, thick=2):
    """Draw a sci-fi style ROI as four corner brackets instead of a full box."""
    L = _BRACKET
    for (cx, cy, dx, dy) in (
        (x1, y1,  1,  1),  # top-left
        (x2, y1, -1,  1),  # top-right
        (x1, y2,  1, -1),  # bottom-left
        (x2, y2, -1, -1),  # bottom-right
    ):
        cv2.line(img, (cx, cy), (cx + L * dx, cy), colour, thick, cv2.LINE_AA)
        cv2.line(img, (cx, cy), (cx, cy + L * dy), colour, thick, cv2.LINE_AA)


def _draw_label_pill(img, x, y, text, fg=(20, 30, 50), bg=_TEAL,
                     font_scale=0.45, thick=1):
    """Filled rectangle behind text — readable label even on bright pellets."""
    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thick)
    pad_x, pad_y = 4, 3
    box_w, box_h = tw + pad_x * 2, th + pad_y * 2
    # Anchor pill above (x, y); if it would clip the top, draw below instead
    by1 = y - box_h
    if by1 < 0:
        by1 = y + 2
    cv2.rectangle(img, (x, by1), (x + box_w, by1 + box_h), bg, -1, cv2.LINE_AA)
    cv2.putText(img, text, (x + pad_x, by1 + box_h - pad_y),
                cv2.FONT_HERSHEY_SIMPLEX, font_scale, fg, thick, cv2.LINE_AA)


def _draw_count_overlay(img, count):
    """Big top-left 'Nurdles: N' badge with semi-transparent backdrop."""
    text = f"Nurdles: {count}"
    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.85, 2)
    pad = 10
    x, y = 12, 12
    overlay = img.copy()
    cv2.rectangle(overlay, (x, y), (x + tw + pad * 2, y + th + pad * 2),
                  (8, 12, 22), -1)
    cv2.addWeighted(overlay, 0.65, img, 0.35, 0, img)
    cv2.rectangle(img, (x, y), (x + tw + pad * 2, y + th + pad * 2),
                  _TEAL, 1, cv2.LINE_AA)
    cv2.putText(img, text, (x + pad, y + pad + th),
                cv2.FONT_HERSHEY_SIMPLEX, 0.85, _TEAL, 2, cv2.LINE_AA)


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
        self._smooth_count    = 0.0     # EMA-smoothed count for steady display
        self._candidate_state = "CLEAR" # state being considered (debounce)
        self._candidate_since = 0.0     # monotonic time the candidate started
        self._class_names     = []      # populated from ONNX model metadata
        self.breakdown        = {}      # class_name -> instance count this frame

        self._try_load_onnx()

    # ─── Public API ──────────────────────────────────────────────

    def start(self):
        self._running = True
        self._open_camera()      # First attempt; the _loop will retry forever if it fails
        self._thread = threading.Thread(target=self._loop, name="vision", daemon=True)
        self._thread.start()
        print("[vision] Started —", "YOLOv8 ONNX" if self._use_yolo else "OpenCV HSV fallback")

    def _open_camera(self):
        """Try to open the camera. Returns True on success, False otherwise."""
        try:
            if self._cap is not None:
                self._cap.release()
        except Exception:
            pass
        self._cap = cv2.VideoCapture(CAMERA_INDEX)
        if self._cap.isOpened():
            print(f"[vision] Camera opened (index {CAMERA_INDEX})")
            return True
        print(f"[vision] WARNING: could not open camera index {CAMERA_INDEX} — will retry")
        return False

    def stop(self):
        self._running = False
        if self._cap:
            self._cap.release()

    def get(self):
        """Return (state, confidence, count) — thread-safe snapshot."""
        with self._lock:
            return self.state, self.confidence, self.count

    def get_frame(self):
        """Return a copy of the latest annotated frame, or None."""
        with self._lock:
            return None if self.frame is None else self.frame.copy()

    def get_breakdown(self):
        """Return a thread-safe copy of the per-class detection counts."""
        with self._lock:
            return dict(self.breakdown)

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
            # Class names are stored by Ultralytics in the ONNX metadata
            # under the 'names' key, e.g. "{0: 'Pen', 1: 'Fragment', ...}"
            try:
                import ast
                meta = self._session.get_modelmeta().custom_metadata_map
                names_str = meta.get("names", "")
                if names_str:
                    names_dict = ast.literal_eval(names_str)
                    self._class_names = [
                        names_dict[i] for i in sorted(names_dict.keys())
                    ]
                    print(f"[vision] {len(self._class_names)} class names loaded")
            except Exception as exc:
                print(f"[vision] Class names unavailable: {exc}")
        except Exception as exc:
            print(f"[vision] onnxruntime load error: {exc} — using OpenCV fallback")

    # ─── Inference loop ──────────────────────────────────────────

    def _loop(self):
        last_reopen_attempt = 0.0
        while self._running:
            # Self-heal: if the camera isn't open (boot race) or starts
            # returning empty frames (unplug), retry opening it every 3 s
            # in the background instead of giving up.
            if self._cap is None or not self._cap.isOpened():
                now = time.monotonic()
                if now - last_reopen_attempt >= 3.0:
                    last_reopen_attempt = now
                    self._open_camera()
                time.sleep(0.5)
                continue

            ret, frame = self._cap.read()
            if not ret:
                # Read failed — likely a transient hiccup or the camera
                # unplugged. Drop it and let the reopen-loop above handle it.
                try:
                    self._cap.release()
                except Exception:
                    pass
                self._cap = None
                time.sleep(0.1)
                continue

            if self._use_yolo:
                count, conf, annotated = self._infer_onnx(frame)
                # Only fall back to HSV when YOLO is finding almost nothing.
                # Prevents the double-annotation (yellow boxes + cyan circles
                # on the same pellet) the user saw in the bottle test, and
                # stops bottle-wall glare from inflating the count when YOLO
                # has already detected real pellets confidently.
                if HYBRID_HSV and count < COUNT_WARN:
                    hsv_count, hsv_conf, annotated = self._infer_hsv(
                        annotated, overlay=True
                    )
                    if hsv_count > count:
                        count = hsv_count
                        conf  = max(conf, hsv_conf)
            else:
                count, conf, annotated = self._infer_hsv(frame)

            # EMA-smoothed count drives both the displayed value and the
            # state classification. Slow alpha = very stable, no flicker.
            SMOOTH_ALPHA = 0.20
            self._smooth_count = (
                SMOOTH_ALPHA * count + (1.0 - SMOOTH_ALPHA) * self._smooth_count
            )
            display_count = int(round(self._smooth_count))

            # Candidate state from the smoothed count
            if display_count >= COUNT_CRIT:
                candidate = "CRIT"
            elif display_count >= COUNT_WARN:
                candidate = "WARN"
            else:
                candidate = "CLEAR"

            # Confirmation timer — state only flips after the candidate has
            # been held continuously for HOLD_*. Brief flickers, single-frame
            # spikes, and momentary glare all fail to trigger an alarm.
            HOLD_WARN  = 1.5    # seconds to confirm WARN  (yellow)
            HOLD_CRIT  = 2.5    # seconds to confirm CRIT  (red, ALARM)
            HOLD_CLEAR = 2.0    # seconds to confirm return to CLEAR

            now_t = time.monotonic()
            if candidate != self._candidate_state:
                self._candidate_state = candidate
                self._candidate_since = now_t

            held = now_t - self._candidate_since
            required = (HOLD_CRIT  if candidate == "CRIT"  else
                        HOLD_WARN  if candidate == "WARN"  else
                        HOLD_CLEAR)
            state = candidate if held >= required else self.state

            # Draw the smoothed count overlay so the camera feed shows the
            # SAME number as the website (no more raw vs smoothed mismatch).
            _draw_count_overlay(annotated, display_count)

            with self._lock:
                self.count      = display_count
                self.confidence = conf
                self.state      = state
                self.frame      = annotated

    # ─── YOLOv8 ONNX inference ───────────────────────────────────

    def _infer_onnx(self, frame):
        h, w = frame.shape[:2]
        # Same central-60% ROI as the HSV pass — both detectors must agree on
        # what region is "the flow cell" so they never disagree on background.
        roi_x1, roi_y1 = int(w * 0.20), int(h * 0.20)
        roi_x2, roi_y2 = int(w * 0.80), int(h * 0.80)

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
            with self._lock:
                self.breakdown = {}
            return 0, 0.0, frame.copy()

        preds_k    = preds[keep]
        confs_k    = confidences[keep]
        cls_ids_k  = class_ids[keep]

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

        annotated = frame.copy()
        _draw_roi_brackets(annotated, roi_x1, roi_y1, roi_x2, roi_y2)

        if len(indices) == 0:
            return 0, 0.0, annotated

        indices = np.array(indices).flatten()

        # ROI filter — keep only detections whose centre lies inside the ROI.
        kept = []
        for i in indices:
            bx, by, bw_i, bh_i = boxes_xywh[i]
            cx = bx + bw_i / 2
            cy = by + bh_i / 2
            if roi_x1 <= cx <= roi_x2 and roi_y1 <= cy <= roi_y2:
                kept.append(i)

        if not kept:
            with self._lock:
                self.breakdown = {}
            return 0, 0.0, annotated

        count = len(kept)
        conf  = float(confs_k[kept].max())

        # Build per-class count breakdown for the website
        breakdown = {}
        for i in kept:
            cls = int(cls_ids_k[i])
            name = (self._class_names[cls]
                    if cls < len(self._class_names) else f"Class {cls}")
            breakdown[name] = breakdown.get(name, 0) + 1
        with self._lock:
            self.breakdown = breakdown

        for i in kept:
            bx, by, bw_i, bh_i = boxes_xywh[i]
            cls = int(cls_ids_k[i])
            label = (self._class_names[cls]
                     if cls < len(self._class_names) else f"#{cls}")
            x1i, y1i = int(bx), int(by)
            x2i, y2i = int(bx + bw_i), int(by + bh_i)
            cv2.rectangle(annotated, (x1i, y1i), (x2i, y2i), _TEAL, 2, cv2.LINE_AA)
            _draw_label_pill(annotated, x1i, y1i, f"{label} {confs_k[i]:.2f}")

        # Note: count overlay is drawn in _loop with the *smoothed* count so
        # the camera feed and the website show identical numbers.
        return count, conf, annotated

    # ─── OpenCV HSV fallback ─────────────────────────────────────

    def _infer_hsv(self, frame, overlay=False):
        """
        Detect bright/white objects via HSV threshold + contour analysis.
        Tuned to be sensitive: catches paper, foam, beads, pellets.
        Large blobs (e.g. a full sheet of paper) are split into multiple
        virtual detections so the count scales with how much white is visible.
        """
        h, w = frame.shape[:2]
        # Region of Interest — analyse only the central 60% of the frame
        # (where the flow cell sits). Ignores wall/edge/LED-housing reflections.
        roi_x1, roi_y1 = int(w * 0.20), int(h * 0.20)
        roi_x2, roi_y2 = int(w * 0.80), int(h * 0.80)

        hsv  = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        # Tighter white range (V>=170, S<=60) so glare doesn't merge real
        # pellets into one giant blob. Pellets stay distinct, count goes up,
        # circles stay small around each pellet.
        mask = cv2.inRange(hsv, (0, 0, 170), (180, 60, 255))
        k    = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN,  k)
        # NOTE: no MORPH_CLOSE — closing was merging adjacent pellets into
        # one giant blob, killing the count and bloating the circles.

        # Apply ROI: zero out everything outside the central window
        roi_mask = np.zeros(mask.shape, dtype=np.uint8)
        roi_mask[roi_y1:roi_y2, roi_x1:roi_x2] = 255
        mask = cv2.bitwise_and(mask, roi_mask)

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        count   = 0
        pellets = []
        for c in contours:
            area = cv2.contourArea(c)
            if area < 30:
                continue
            # Max-area filter — reject giant blobs (LED glare, container glow,
            # camera flare) that wouldn't be a single pellet anyway.
            if area > 5000:
                continue
            # Circularity filter — pellets are round-ish (>= 0.4).
            # Long thin highlights or irregular splash patterns are rejected.
            perimeter = cv2.arcLength(c, True)
            if perimeter == 0:
                continue
            circularity = 4.0 * np.pi * area / (perimeter * perimeter)
            if circularity < 0.4:
                continue
            # Smaller divisor (600 vs 1200) so a clump of touching pellets
            # still registers as multiple, even if morphology partially merges.
            n = max(1, int(area // 600))
            count += n
            pellets.append((c, n))

        # Cap so a blank wall doesn't peg the meter to absurd numbers,
        # but leave room (5x CRIT = 50) for visual escalation in the demo
        count = min(count, COUNT_CRIT * 5)
        conf  = min(1.0, count / max(COUNT_CRIT, 1))

        annotated = frame if overlay else frame.copy()
        if not overlay:
            _draw_roi_brackets(annotated, roi_x1, roi_y1, roi_x2, roi_y2)
        for c, n in pellets:
            (x, y), r = cv2.minEnclosingCircle(c)
            cv2.circle(annotated, (int(x), int(y)), int(r) + 2,
                       _AMBER, 2, cv2.LINE_AA)
            if n > 1:
                _draw_label_pill(annotated, int(x) - 10, int(y) - int(r) - 4,
                                 f"x{n}", fg=(20, 30, 50), bg=_AMBER)
        # Count overlay is drawn in _loop with the smoothed count so the
        # camera feed and the website always show the same number.
        return count, conf, annotated
