"""
test_model.py — Quick sanity check for the exported ONNX model.
Run this on the Jetson BEFORE starting main.py to confirm detection works.

Usage:
    python3 test_model.py                  # uses webcam (index 0)
    python3 test_model.py --image photo.jpg  # run on a single image
    python3 test_model.py --model path/to/model.onnx
"""

import argparse
import sys
import time
from pathlib import Path

import cv2

from config import YOLO_MODEL, YOLO_CONF, YOLO_IOU, COUNT_WARN, COUNT_CRIT


def test_on_image(model, image_path: str):
    frame = cv2.imread(image_path)
    if frame is None:
        print(f"[test] Could not load image: {image_path}")
        sys.exit(1)

    results = model(frame, conf=YOLO_CONF, iou=YOLO_IOU, verbose=False)
    count   = len(results[0].boxes)
    conf    = float(results[0].boxes.conf.max()) if count > 0 else 0.0
    state   = "CRIT" if count >= COUNT_CRIT else "WARN" if count >= COUNT_WARN else "CLEAR"

    annotated = results[0].plot()
    out_path  = "test_output.jpg"
    cv2.imwrite(out_path, annotated)

    print(f"\n[test] Image: {image_path}")
    print(f"  Nurdles detected: {count}")
    print(f"  Max confidence:   {conf:.2f}")
    print(f"  FSM state:        {state}")
    print(f"  Annotated image saved to: {out_path}")


def test_on_camera(model, camera_index: int):
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        print(f"[test] Could not open camera {camera_index}")
        sys.exit(1)

    print(f"[test] Camera {camera_index} opened. Press Q to quit.\n")
    fps_times = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        t0 = time.perf_counter()
        results = model(frame, conf=YOLO_CONF, iou=YOLO_IOU, verbose=False)
        dt = time.perf_counter() - t0

        count = len(results[0].boxes)
        conf  = float(results[0].boxes.conf.max()) if count > 0 else 0.0
        state = "CRIT" if count >= COUNT_CRIT else "WARN" if count >= COUNT_WARN else "CLEAR"

        fps_times.append(dt)
        fps = 1.0 / (sum(fps_times[-10:]) / min(len(fps_times), 10))

        annotated = results[0].plot()

        # Overlay stats
        colour = (0, 60, 255) if state == "CRIT" else (0, 165, 255) if state == "WARN" else (0, 200, 80)
        cv2.putText(annotated, f"State: {state}  Count: {count}  Conf: {conf:.2f}",
                    (12, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.9, colour, 2)
        cv2.putText(annotated, f"FPS: {fps:.1f}  Inference: {dt*1000:.0f}ms",
                    (12, 72), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (180, 180, 180), 1)

        print(f"\r  {state:5s} | {count:3d} nurdles | conf {conf:.2f} | {fps:.1f} fps | {dt*1000:.0f}ms",
              end="", flush=True)

        cv2.imshow("NurdleDNA — Model Test (Q to quit)", annotated)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print()


def main():
    parser = argparse.ArgumentParser(description="Test NurdleDNA ONNX model")
    parser.add_argument("--model",  default=YOLO_MODEL, help="Path to .onnx model")
    parser.add_argument("--image",  default=None,       help="Test on a single image file")
    parser.add_argument("--camera", type=int, default=0, help="Camera index (default 0)")
    args = parser.parse_args()

    model_path = args.model or YOLO_MODEL
    if not model_path or not Path(model_path).exists():
        print(f"[test] Model not found at '{model_path}'")
        print("[test] Run train.py first, or set YOLO_MODEL in config.py")
        sys.exit(1)

    print(f"[test] Loading model: {model_path}")
    from ultralytics import YOLO
    model = YOLO(model_path)
    print(f"[test] Model loaded. Thresholds — conf:{YOLO_CONF}  iou:{YOLO_IOU}")
    print(f"[test] WARN at >={COUNT_WARN} nurdles, CRIT at >={COUNT_CRIT} nurdles\n")

    if args.image:
        test_on_image(model, args.image)
    else:
        test_on_camera(model, args.camera)


if __name__ == "__main__":
    main()
