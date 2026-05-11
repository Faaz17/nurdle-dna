# YOLOv8n Training Guide — NurdleDNA

Train the nurdle detection model on Google Colab (free GPU) in ~30 minutes,
then deploy the resulting `.onnx` file to your Jetson Nano.

---

## Pipeline

```
Roboflow Universe (dataset)
   ↓ download
Google Colab T4 GPU (training, 20–25 min)
   ↓ export
nurdle-yolov8n.onnx
   ↓ scp / USB
Jetson Nano (real-time inference)
```

---

## Step 1 — Find a public dataset

Go to **https://universe.roboflow.com**

Search for one of: `nurdle`, `microplastic`, `plastic pellet`, `pellet detection`

Pick a project marked **"Public"** with reasonable image count (>200) and class names matching what you want to detect. Open it. The URL will look like:

```
https://universe.roboflow.com/<WORKSPACE>/<PROJECT>/<VERSION>
                              ▲           ▲         ▲
                              copy these three values
```

Examples of what to look for:
- A "microplastics" or "pellet" detection project
- Single class (e.g. "pellet" or "microplastic") OR multi-class
- Bounding-box annotations (YOLOv8 format compatible)

If you can't find one, **upload your own 50–100 nurdle photos to Roboflow** and label them yourself (free; takes ~1 hour).

---

## Step 2 — Get a Roboflow API key

1. Go to **https://app.roboflow.com**
2. Sign up free (or log in)
3. Click profile picture (top right) → **API Keys**
4. Copy your **Private API Key**

---

## Step 3 — Open Google Colab

Go to **https://colab.research.google.com** → New notebook

Top menu: **Runtime → Change runtime type → T4 GPU → Save**

---

## Step 4 — Run these cells in order

### Cell 1 — Install dependencies
```python
!pip install -q ultralytics roboflow onnxruntime
```

### Cell 2 — Download the dataset (paste your values)
```python
from roboflow import Roboflow

API_KEY   = "PASTE_YOUR_KEY_HERE"
WORKSPACE = "paste-workspace-from-step-1"
PROJECT   = "paste-project-from-step-1"
VERSION   = 1   # change to the version number you copied

rf      = Roboflow(api_key=API_KEY)
project = rf.workspace(WORKSPACE).project(PROJECT)
dataset = project.version(VERSION).download("yolov8")

print("Dataset saved to:", dataset.location)
```

If you get `Permission denied` or `Project not found`:
- Double-check the workspace/project spelling (URL is case-sensitive)
- The dataset might not be public — try a different one

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
```

Takes ~15–25 minutes on Colab T4.

### Cell 4 — Validate (record these for D6 report)
```python
metrics = model.val()
print(f"mAP50:     {metrics.box.map50:.3f}")
print(f"mAP50-95:  {metrics.box.map:.3f}")
print(f"Precision: {metrics.box.mp:.3f}")
print(f"Recall:    {metrics.box.mr:.3f}")
```

**Target for D6:** mAP50 > 0.80 is excellent. Below 0.60 means try a different dataset or more epochs.

### Cell 5 — Export to ONNX
```python
best = YOLO("runs/detect/nurdle-yolov8n/weights/best.pt")
best.export(format="onnx", imgsz=640, simplify=True, opset=12)
print("ONNX model saved to: runs/detect/nurdle-yolov8n/weights/best.onnx")
```

### Cell 6 — Download to your laptop
```python
from google.colab import files
files.download("runs/detect/nurdle-yolov8n/weights/best.onnx")
```

A file called `best.onnx` will download.

---

## Step 5 — Copy to Jetson

Rename `best.onnx` → `nurdle-yolov8n.onnx`

```bash
# From your laptop (replace <JETSON_IP>)
scp nurdle-yolov8n.onnx jetson@<JETSON_IP>:~/nurdle-dna/jetson/models/
```

---

## Step 6 — Install ONLY the runtime deps on Jetson Nano

**IMPORTANT:** the original Jetson Nano (not Orin) cannot `pip install ultralytics` cleanly because torch/torchvision require NVIDIA-built ARM wheels. We don't actually need ultralytics on the Jetson — we just need to RUN the ONNX model.

On the Jetson:
```bash
# Lightweight install — no torch, no ultralytics
pip3 install pyrebase4 pyserial opencv-python onnxruntime

# (NOT pip3 install -r requirements.txt — that pulls in ultralytics which fails)
```

If your Jetson has Python 3.6 (JetPack 4.x), you may need:
```bash
pip3 install onnxruntime==1.10.0   # last version supporting Py3.6
```

**Note:** vision.py loads ONNX via `from ultralytics import YOLO`. On Jetson Nano if ultralytics fails to install, the code falls back to the OpenCV HSV detector (still works). For best results, run on Jetson Orin or use TensorRT (next step).

---

## Step 7 — Test on Jetson

```bash
cd ~/nurdle-dna/jetson
python3 test_model.py
```

You should see a window with bounding boxes around detected nurdles + live FPS.

---

## Step 8 — Run the full system

Once test_model.py works:
```bash
python3 main.py
```

Vision → Arduino over serial → Firebase → website. Live mode kicks in within seconds.

---

## Optional: TensorRT for faster Jetson inference

If ONNX is too slow (<3 FPS), convert to TensorRT (2–5× faster):
```bash
# On Jetson with trtexec installed
trtexec --onnx=models/nurdle-yolov8n.onnx \
        --saveEngine=models/nurdle-yolov8n.engine \
        --fp16
```

Then update `config.py`:
```python
YOLO_MODEL = "models/nurdle-yolov8n.engine"
```

Note: TensorRT engines are not portable between devices — must be built on the same Jetson where they'll run.

---

## D6 Report — numbers to record

| Metric | Where to find |
|--------|--------------|
| mAP50 | Cell 4 output |
| mAP50-95 | Cell 4 output |
| Precision | Cell 4 output |
| Recall | Cell 4 output |
| Training epochs | 50 (or early-stop epoch from Cell 3) |
| Dataset size | Roboflow project page |
| Inference FPS (Jetson) | test_model.py live output |
| Inference latency (ms) | test_model.py live output |

---

## Why two ways to train? (train.py vs Colab cells)

- **TRAINING.md (this file):** the easy path — paste cells in Colab, no setup
- **train.py:** the same logic as a single script — for users with their own GPU

Both produce the same `nurdle-yolov8n.onnx`. **Use Colab unless you have a CUDA-capable GPU on your laptop.**
