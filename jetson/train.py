"""
NurdleDNA — YOLOv8n Training Script
=====================================
Trains a YOLOv8n model on a microplastic pellet dataset from Roboflow,
then exports to ONNX for deployment on the Jetson Nano.

RECOMMENDED: Run this on Google Colab (free T4 GPU) — see TRAINING.md
Can also run locally if you have an NVIDIA GPU + CUDA.

Usage:
    python3 train.py --api-key YOUR_ROBOFLOW_KEY

Get a free Roboflow API key at: https://app.roboflow.com (sign up → top right → API key)
"""

import argparse
import os
import shutil
from pathlib import Path


# ─── Config ──────────────────────────────────────────────────────
ROBOFLOW_WORKSPACE = "brad-dwyer"           # Roboflow public workspace
ROBOFLOW_PROJECT   = "microplastics-iezxj"  # Microplastics pellet dataset
ROBOFLOW_VERSION   = 2                       # Dataset version
DATASET_FORMAT     = "yolov8"

MODEL_BASE     = "yolov8n.pt"   # nano — fastest, runs on Jetson
EPOCHS         = 50             # 50 is good; use 100 for better accuracy
IMAGE_SIZE     = 640
BATCH_SIZE     = 16             # reduce to 8 if GPU runs out of memory
EXPORT_FORMAT  = "onnx"
OUTPUT_NAME    = "nurdle-yolov8n.onnx"
MODELS_DIR     = Path(__file__).parent / "models"


def install_deps():
    os.system("pip install -q ultralytics roboflow")


def download_dataset(api_key: str) -> str:
    from roboflow import Roboflow
    print(f"\n[dataset] Downloading from Roboflow: {ROBOFLOW_PROJECT} v{ROBOFLOW_VERSION}")
    rf      = Roboflow(api_key=api_key)
    project = rf.workspace(ROBOFLOW_WORKSPACE).project(ROBOFLOW_PROJECT)
    dataset = project.version(ROBOFLOW_VERSION).download(DATASET_FORMAT)
    print(f"[dataset] Saved to: {dataset.location}")
    return dataset.location


def train(dataset_path: str):
    from ultralytics import YOLO

    print(f"\n[train] Starting YOLOv8n training — {EPOCHS} epochs, imgsz={IMAGE_SIZE}")
    model = YOLO(MODEL_BASE)

    results = model.train(
        data    = os.path.join(dataset_path, "data.yaml"),
        epochs  = EPOCHS,
        imgsz   = IMAGE_SIZE,
        batch   = BATCH_SIZE,
        name    = "nurdle-yolov8n",
        exist_ok= True,
        patience= 15,     # early stop if no improvement for 15 epochs
        augment = True,
        mosaic  = 1.0,
        flipud  = 0.3,
        fliplr  = 0.5,
        degrees = 15,
        translate=0.1,
        scale   = 0.5,
        hsv_h   = 0.015,
        hsv_s   = 0.7,
        hsv_v   = 0.4,
    )

    best_weights = Path("runs/detect/nurdle-yolov8n/weights/best.pt")
    print(f"\n[train] Done. Best weights: {best_weights}")
    print(f"[train] mAP50: {results.results_dict.get('metrics/mAP50(B)', '?'):.3f}")
    return best_weights


def export_onnx(weights_path: Path) -> Path:
    from ultralytics import YOLO

    print(f"\n[export] Exporting {weights_path} → ONNX")
    model = YOLO(str(weights_path))
    model.export(format="onnx", imgsz=IMAGE_SIZE, simplify=True, opset=12)

    onnx_path = weights_path.with_suffix(".onnx")
    MODELS_DIR.mkdir(exist_ok=True)
    dest = MODELS_DIR / OUTPUT_NAME
    shutil.copy(onnx_path, dest)
    print(f"[export] Saved to: {dest}")
    return dest


def validate(weights_path: Path, dataset_path: str):
    from ultralytics import YOLO
    print(f"\n[validate] Running validation on best weights...")
    model   = YOLO(str(weights_path))
    metrics = model.val(data=os.path.join(dataset_path, "data.yaml"), imgsz=IMAGE_SIZE)
    print(f"[validate] mAP50:    {metrics.box.map50:.3f}")
    print(f"[validate] mAP50-95: {metrics.box.map:.3f}")
    print(f"[validate] Precision:{metrics.box.mp:.3f}")
    print(f"[validate] Recall:   {metrics.box.mr:.3f}")
    return metrics


def main():
    parser = argparse.ArgumentParser(description="Train NurdleDNA YOLOv8n model")
    parser.add_argument("--api-key",  required=True, help="Roboflow API key")
    parser.add_argument("--epochs",   type=int, default=EPOCHS)
    parser.add_argument("--batch",    type=int, default=BATCH_SIZE)
    parser.add_argument("--skip-download", action="store_true",
                        help="Skip dataset download if already present")
    args = parser.parse_args()

    install_deps()

    dataset_path = download_dataset(args.api_key) if not args.skip_download else "dataset"

    best_weights = train(dataset_path)

    metrics = validate(best_weights, dataset_path)

    onnx_dest = export_onnx(best_weights)

    print("\n" + "=" * 52)
    print("  TRAINING COMPLETE")
    print("=" * 52)
    print(f"  mAP50:    {metrics.box.map50:.3f}")
    print(f"  mAP50-95: {metrics.box.map:.3f}")
    print(f"  ONNX model: {onnx_dest}")
    print()
    print("  Next step: copy the model to your Jetson")
    print(f"  scp {onnx_dest} jetson@<IP>:~/nurdle-dna/jetson/models/")
    print("=" * 52)


if __name__ == "__main__":
    main()
