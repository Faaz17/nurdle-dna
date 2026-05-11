# YOLOv8n Training Guide — NurdleDNA

Train the nurdle detection model in ~20 minutes on Google Colab (free).
No GPU on your laptop needed.

---

## Overview

```
Roboflow dataset  →  Google Colab (train)  →  ONNX export  →  Jetson Nano
```

---

## Step 1 — Get a free Roboflow API key

1. Go to **https://app.roboflow.com**
2. Sign up (free)
3. Click your profile picture (top right) → **"API Keys"**
4. Copy the **Private API Key**

---

## Step 2 — Open Google Colab

Go to **https://colab.research.google.com**

Create a new notebook. At the top: **Runtime → Change runtime type → T4 GPU → Save**

---

## Step 3 — Run these cells in order

### Cell 1 — Install dependencies
```python
!pip install -q ultralytics roboflow
```

### Cell 2 — Download the dataset
```python
from roboflow import Roboflow

API_KEY = "PASTE_YOUR_KEY_HERE"   # ← replace with your key

rf      = Roboflow(api_key=API_KEY)
project = rf.workspace("brad-dwyer").project("microplastics-iezxj")
dataset = project.version(2).download("yolov8")

print("Dataset saved to:", dataset.location)
```

### Cell 3 — Train YOLOv8n
```python
from ultralytics import YOLO

model = YOLO("yolov8n.pt")   # downloads ~6 MB base model

results = model.train(
    data    = f"{dataset.location}/data.yaml",
    epochs  = 50,
    imgsz   = 640,
    batch   = 16,
    name    = "nurdle-yolov8n",
    patience= 15,
    augment = True,
)

print("Training complete!")
print("mAP50:", results.results_dict.get("metrics/mAP50(B)", "?"))
```

**This takes ~15–25 minutes on Colab T4.**

### Cell 4 — Validate (check accuracy)
```python
metrics = model.val()
print(f"mAP50:     {metrics.box.map50:.3f}")
print(f"mAP50-95:  {metrics.box.map:.3f}")
print(f"Precision: {metrics.box.mp:.3f}")
print(f"Recall:    {metrics.box.mr:.3f}")
```

**Target for D6 report:** mAP50 > 0.80 is excellent for a student project.

### Cell 5 — Export to ONNX
```python
best = YOLO("runs/detect/nurdle-yolov8n/weights/best.pt")
best.export(format="onnx", imgsz=640, simplify=True, opset=12)
print("ONNX model saved to: runs/detect/nurdle-yolov8n/weights/best.onnx")
```

### Cell 6 — Download the model to your laptop
```python
from google.colab import files
files.download("runs/detect/nurdle-yolov8n/weights/best.onnx")
```

A file called `best.onnx` will download to your laptop.

---

## Step 4 — Copy model to Jetson

Rename the downloaded file to `nurdle-yolov8n.onnx`, then copy to Jetson:

```bash
# From your laptop (replace <JETSON_IP> with the Jetson's IP address)
scp nurdle-yolov8n.onnx jetson@<JETSON_IP>:~/nurdle-dna/jetson/models/
```

Or if you have a USB drive:
```bash
cp nurdle-yolov8n.onnx /media/usb/
# On Jetson:
cp /media/usb/nurdle-yolov8n.onnx ~/nurdle-dna/jetson/models/
```

---

## Step 5 — Test on Jetson

```bash
cd ~/nurdle-dna/jetson

# Test on webcam (live view with bounding boxes)
python3 test_model.py

# Test on a single image
python3 test_model.py --image /path/to/nurdle_photo.jpg
```

You should see a window with bounding boxes around detected nurdles, plus live FPS.

**Expected performance on Jetson Nano:**
- ~4–8 FPS with ONNX (CPU inference)
- ~10–15 FPS with TensorRT optimisation (optional, see below)

---

## Step 6 — Update config.py

Confirm this line in `jetson/config.py`:
```python
YOLO_MODEL = "models/nurdle-yolov8n.onnx"
```

Then run the full system:
```bash
python3 main.py
```

---

## Optional: TensorRT optimisation (faster on Jetson)

After confirming ONNX works, convert to TensorRT for 2–3× faster inference:

```bash
# On the Jetson:
yolo export model=models/nurdle-yolov8n.onnx format=engine device=0
```

Then update `config.py`:
```python
YOLO_MODEL = "models/nurdle-yolov8n.engine"
```

---

## D6 Report — numbers to record

After training, collect these for the Final Design Report:

| Metric | Where to find |
|--------|--------------|
| mAP50 | Cell 4 output |
| mAP50-95 | Cell 4 output |
| Precision | Cell 4 output |
| Recall | Cell 4 output |
| Training epochs | 50 (or early-stop epoch) |
| Dataset size | Roboflow project page |
| Inference FPS | test_model.py live output |
| Inference latency (ms) | test_model.py live output |

---

## Dataset info

**Source:** Roboflow Universe — Microplastics Detection Dataset  
**Project:** `brad-dwyer/microplastics-iezxj`  
**Classes:** `microplastic` (includes pellets, nurdles, fragments)  
**Augmentations applied during training:** flip, rotation ±15°, HSV shift, mosaic, scale

If mAP50 is below 0.75, consider adding your own nurdle photos:
1. Take 50–100 photos of real nurdles in water
2. Upload to Roboflow → annotate (draw boxes) → add to the dataset
3. Re-run Cell 3 with `epochs=100`
