# NurdleDNA — Jetson Nano Agent

Runs on the NVIDIA Jetson Nano. Handles AI vision, serial comms with the Arduino, and Firebase cloud publishing.

---

## 1. First-time setup

```bash
# Clone repo on Jetson
git clone https://github.com/Faaz17/nurdle-dna.git
cd nurdle-dna/jetson

# Install Python dependencies
pip3 install -r requirements.txt
```

---

## 2. Configure

Edit `config.py`:

| Setting | What to change |
|---------|---------------|
| `SERIAL_PORT` | Run `ls /dev/tty*` before and after plugging in USB → find the new entry (usually `/dev/ttyUSB0` or `/dev/ttyACM0`) |
| `CAMERA_INDEX` | `0` for USB webcam; for CSI cam use the GStreamer string from Jetson camera docs |
| `YOLO_MODEL` | Path to your `.onnx` model. Set `None` to use OpenCV fallback |
| `FIREBASE_CONFIG` | Paste values from Firebase Console → Project Settings → General → Web app |

---

## 3. YOLOv8 model (optional but recommended)

**Option A — Use Roboflow pre-trained nurdle model (fastest)**
```bash
pip3 install roboflow
python3 -c "
from roboflow import Roboflow
rf = Roboflow(api_key='YOUR_ROBOFLOW_KEY')
project = rf.workspace().project('nurdle-microplastic')
model = project.version(1).model
model.download('yolov8')
"
# Then export to ONNX:
yolo export model=nurdle-microplastic.pt format=onnx
mv nurdle-microplastic.onnx models/nurdle-yolov8n.onnx
```

**Option B — Skip model, use OpenCV fallback**
Set `YOLO_MODEL = None` in `config.py`. The HSV colour detector works without any model file.

---

## 4. Run

```bash
python3 main.py
```

Press `Ctrl+C` to stop cleanly.

---

## 5. Auto-start on Jetson boot (systemd)

```bash
sudo nano /etc/systemd/system/nurdledna.service
```

Paste:
```ini
[Unit]
Description=NurdleDNA Jetson Agent
After=network.target

[Service]
ExecStart=/usr/bin/python3 /home/jetson/nurdle-dna/jetson/main.py
WorkingDirectory=/home/jetson/nurdle-dna/jetson
Restart=on-failure
User=jetson

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable nurdledna
sudo systemctl start nurdledna
sudo systemctl status nurdledna
```

---

## 6. Data flow

```
Camera
  → vision.py (YOLOv8n / HSV)
      → count, confidence, state (CLEAR / WARN / CRIT)
          → serial_bridge.py → Arduino (JSON command)
          → cloud.py → Firebase /devices/NURDLE-001
                     → Firebase /events/{key}  (on ALARM)
Arduino
  → serial_bridge.py (JSON telemetry every 200 ms)
      → cloud.py (merged into Firebase payload)
```

---

## 7. Firebase database structure

```json
/devices/NURDLE-001 {
  "timestamp":     "2026-05-11T10:32:00Z",
  "device_id":     "NURDLE-001",
  "bay_id":        "BAY-1",
  "fsm_state":     "S3",
  "valve":         "CLOSED",
  "ldr":           642,
  "gas_ppm":       380,
  "load_g":        3.4,
  "density_index": 72,
  "status":        "ALARM",
  "ai_state":      "CRIT",
  "ai_count":      12,
  "ai_confidence": 0.87
}

/events/{push-key} {
  "timestamp":     "2026-05-11T10:32:00Z",
  "device_id":     "NURDLE-001",
  "type":          "ALARM",
  "fsm_state":     "S3",
  "density_index": 84,
  "gas_ppm":       380,
  "load_g":        3.4,
  "ai_count":      12
}
```
