# NurdleDNA

**ECTE 250 — Team 2 (Arc Tech) — University of Wollongong in Dubai**

An inline IoT water-monitoring unit that detects nurdle microplastics and industrial contaminants, automatically isolates flow, captures physical evidence, and logs audit-grade data to a Firebase cloud dashboard.

🌐 **Live demo:** [faaz17.github.io/nurdle-dna](https://faaz17.github.io/nurdle-dna/)
📊 **Event log:** [faaz17.github.io/nurdle-dna/events.html](https://faaz17.github.io/nurdle-dna/events.html)
🎮 **Control panel:** [faaz17.github.io/nurdle-dna/live-demo.html](https://faaz17.github.io/nurdle-dna/live-demo.html)

---

## Team

| Name | Student ID | Role | Email |
|------|-----------|------|-------|
| Muhammad Haaziq | 8927133 | Design Lead | mh084@uowmail.edu.au |
| Faaz Ali Sayyed | 8943564 | System Architect | fasas305@uowmail.edu.au |
| Daniel Koshy | 8938799 | Circuit Design | djk545@uowmail.edu.au |
| Mohammed Abdul Rahman | 9070734 | Finance | mar699@uowmail.edu.au |

---

## How It Works — Detect → Classify → Actuate → Capture → Report

```
Water inlet
  → Mixing section (anti-settling)
  → Optical flow cell (camera + UV LED + LDR)   ← Jetson Nano: AI vision
  → Servo pinch valve                            ← Arduino FSM: control
  → Evidence cartridge + load cell (HX711)
  → Outlet / waste

Headspace → MQ-135 gas sensor                   ← VOC / gas leak detection
```

Every state change and alarm event is time-stamped and pushed to Firebase. The website subscribes to the same database and renders live data in real time.

---

## System Architecture

**Dual-processor design with cloud dashboard:**

```
┌─────────────────┐    USB Serial JSON    ┌─────────────────┐
│  Arduino Uno    │ ────────────────────► │   Jetson Nano   │
│  ── Sensors     │ ◄──────────────────── │   ── YOLOv8n    │
│  ── 5-state FSM │    115200 baud        │   ── Camera     │
│  ── Servo valve │    200 ms cadence     │   ── pyrebase4  │
│  ── LCD + LEDs  │                       └────────┬────────┘
└─────────────────┘                                │
                                                   │ Firebase
                                                   ▼
                                         ┌─────────────────┐
                                         │ Realtime DB     │
                                         │ /devices/...    │
                                         │ /events/...     │
                                         └────────┬────────┘
                                                  │ Web SDK
                                                  ▼
                                         ┌─────────────────┐
                                         │  Static website │
                                         │  GitHub Pages   │
                                         └─────────────────┘
```

**5-State Moore FSM** (runs on Arduino):

| State | Name | Valve | LEDs | Buzzer | Exit condition |
|-------|------|-------|------|--------|----------------|
| S0 | INIT | Open | All ON | OFF | Self-test complete |
| S1 | SysOk | Open | Green | OFF | WARN input |
| S2 | Causn | Open | Yellow | OFF | CRIT input or CLEAR |
| S3 | ALRM | **Closed** | Red | ON | **RST button only** (latched) |
| S4 | RSTIN | Open | All ON | OFF | Reset complete → S1 |

S3 is latched — operator must physically press the RST button to clear an alarm. This is by design for industrial auditability.

---

## Serial Protocol (Arduino ↔ Jetson)

**Arduino → Jetson** (telemetry, every 200 ms):
```json
{"fsm_state":"S1","valve":"OPEN","ldr":542,"gas":380,"load_g":3.4}
```

**Jetson → Arduino** (vision command, every 200 ms):
```json
{"state":"WARN","confidence":0.85,"count":12}
```

Both sides debounce with a 3-hit confidence window before changing FSM state.

---

## Firebase Schema

```json
/devices/NURDLE-001 {
  "timestamp":     "2026-05-11T14:32:00Z",
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
  "timestamp":     "2026-05-11T14:32:00Z",
  "type":          "ALARM",
  "fsm_state":     "S3",
  "density_index": 84,
  "gas_ppm":       380,
  "load_g":        3.4,
  "ai_count":      12
}
```

---

## Project Structure

```
Nurdle DNA/
├── Website/                  Static dashboard (vanilla JS + Three.js)
│   ├── index.html            Landing page (Arago-themed)
│   ├── live-demo.html        Live device control panel
│   ├── events.html           Audit-grade event log (Firebase)
│   ├── digital-twin.html     3D digital twin scene
│   ├── cad-model.html        CAD viewer
│   ├── firebase-config.js    Web Firebase credentials
│   └── src/                  CSS + JS modules
│
├── firmware/                 Arduino Uno C++ firmware
│   └── nurdle-dna/
│       └── nurdle-dna.ino    Full 5-state FSM, sensors, serial JSON
│
├── jetson/                   NVIDIA Jetson Nano Python pipeline
│   ├── main.py               Entry point (threads vision + serial + cloud)
│   ├── vision.py             YOLOv8n / OpenCV camera inference
│   ├── serial_bridge.py      Arduino JSON serial protocol
│   ├── cloud.py              Firebase Realtime DB publisher
│   ├── config.py             All thresholds and credentials
│   ├── train.py              YOLOv8n training script
│   ├── test_model.py         Live camera test + FPS overlay
│   ├── requirements.txt
│   ├── README.md             Install + run guide
│   ├── TRAINING.md           Google Colab training walkthrough
│   └── models/               .onnx YOLOv8 weights (gitignored, 12 MB)
│
├── Fusion Files/             Autodesk Fusion 360 source + glTF exports
├── Virtual Simulation/       glTF models for the 3D web scene
├── Deliverable Reports/      D2 + D3 academic PDFs
├── Posters/                  Innovation Fair posters
├── Team Information/         Team bios (placeholder)
└── .claude/                  Claude Code workspace + project memory
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Website | Vanilla JavaScript + Three.js (no framework, no build step) |
| Hosting | GitHub Pages (auto-deploy via GitHub Actions on push to `main`) |
| Real-time DB | Firebase Realtime Database (project: `nurdle-dna`) |
| Web Firebase SDK | Compat v9 (`firebase-app-compat`, `firebase-database-compat`) |
| Embedded AI | Jetson Nano · YOLOv8n (ONNX) · OpenCV HSV fallback |
| Training | Google Colab (free T4 GPU) · Ultralytics 8 · Roboflow Universe |
| Microcontroller | Arduino Uno · C++ |
| Arduino libraries | Servo, Wire, LiquidCrystal_I2C, HX711 |
| Python deps (Jetson) | ultralytics, onnxruntime, pyrebase4, pyserial, opencv-python |
| CAD | Autodesk Fusion 360 → glTF 2.0 export |

---

## Build Status (as of 2026-05-11)

| Component | Status | Notes |
|-----------|--------|-------|
| Website landing page | ✅ Live | Arago-themed, water-canvas hero, mobile drawer |
| Live demo control panel | ✅ Live | 5-state FSM simulator, sensor graphs, event log |
| Event log page | ✅ Live | Reads `/events` from Firebase, CSV export, filters |
| 3D digital twin | ✅ Live | Three.js scene narrative driven by Firebase |
| Firebase integration | ✅ Wired | Project `nurdle-dna`, web SDK + Python publisher |
| Arduino firmware (`.ino`) | ✅ Complete | 5-state FSM, sensors, HX711, serial JSON |
| Jetson Python pipeline | ✅ Complete | Vision, serial bridge, cloud publisher |
| YOLOv8n nurdle model | ✅ Trained | 25 epochs on microplastics-t0ddd, ONNX exported |
| TinkerCAD breadboard | ⏳ Pending | Firmware ready to paste |
| Real Jetson hardware run | ⏳ Pending | Awaiting Jetson Nano provisioning |
| D6 Final Design Report | ⏳ Pending | All technical data collected |
| D7 Presentation | ⏳ Pending | |
| D8 Innovation Fair | ⏳ Pending | |

---

## AI Model — Training Results

Trained YOLOv8n on the **microplastics-t0ddd** dataset (3,102 images, 19 classes) from Roboflow Universe via Google Colab T4 GPU.

| Metric | Value |
|--------|-------|
| Training epochs | 25 |
| Image size | 640 × 640 |
| mAP50 (overall) | 0.311 |
| mAP50-95 (overall) | 0.209 |
| Precision | 0.396 |
| Recall | 0.358 |
| Model size | 11.7 MB (ONNX) |

**Per-class highlights** (most relevant to nurdle/pellet detection):

| Class | mAP50 |
|-------|-------|
| Pen | 0.811 |
| Air bubble | 0.746 |
| Microfibre | 0.716 |
| Fragment | 0.596 |
| Diatom | 0.525 |

The model performs strongly on Fragment and Microfibre detection — the two classes most analogous to industrial nurdle pellets. The overall mAP50 is averaged across 19 classes including rare samples (1–10 instances) that pull the average down.

For D6 report: cite the per-class metrics for relevant classes rather than the overall average.

---

## Getting Started — by component

### 1. Run the website locally
The website is pure static files. No build step.

```bash
cd Website
python3 -m http.server 8000
# open http://localhost:8000
```

### 2. Configure Firebase
The web template `Website/firebase-config.js` ships with real credentials for the `nurdle-dna` project. Web Firebase keys are public by design — security is enforced by database rules in the Firebase console.

To use a different Firebase project, replace the values in `Website/firebase-config.js` AND `jetson/config.py`.

### 3. Flash the Arduino firmware
Install the libraries (Arduino IDE → Library Manager):
- `Servo` (built-in)
- `Wire` (built-in)
- `LiquidCrystal_I2C` by Frank de Brabander
- `HX711` by Bogdan Necula

Open [firmware/nurdle-dna/nurdle-dna.ino](firmware/nurdle-dna/nurdle-dna.ino) in Arduino IDE and upload. Pin map is documented at the top of the file. Calibrate `SCALE_FACTOR` and gas/LDR thresholds with real sensor readings before D5.

### 4. Set up the Jetson Nano
See [jetson/README.md](jetson/README.md) for full instructions.

Quick version (lightweight install for original Jetson Nano):
```bash
cd jetson
pip3 install pyrebase4 pyserial opencv-python onnxruntime
# Copy nurdle-yolov8n.onnx into jetson/models/
python3 test_model.py         # camera test with bounding boxes
python3 main.py               # full system: vision + serial + Firebase
```

### 5. Train your own YOLOv8 model (optional)
Already done — `jetson/models/nurdle-yolov8n.onnx` exists. To retrain on a different dataset, see [jetson/TRAINING.md](jetson/TRAINING.md) for a 6-cell Google Colab walkthrough.

---

## End-to-End Demo Flow

When all pieces are running together:

1. Camera sees particles → YOLOv8n counts them
2. Jetson sends `{"state":"CRIT","count":12}` to Arduino
3. Arduino debounces (3 consecutive CRIT hits) → enters S3 ALARM
4. Servo valve closes, red LED + buzzer activate, LCD shows "!!! ALARM !!!"
5. Arduino sends telemetry back: `{"fsm_state":"S3","valve":"CLOSED","ldr":642,...}`
6. Jetson merges everything and pushes to Firebase `/devices/NURDLE-001`
7. **Same moment:** Firebase pushes event to `/events/{key}`
8. Website live-demo page automatically flips to LIVE mode (green LED indicator), shows new state
9. Website events page logs the alarm row with timestamp, density, mass, count
10. Operator presses RST → S4 → S1, valve reopens, system rearmed

Response time goal: **detection → valve close < 1 second** (D6 measurement).

---

## Deliverables

| # | Deliverable | Status | Key items |
|---|------------|--------|-----------|
| D1 | Concept Report | ✅ Complete | |
| D2 | Detailed Design Report | ✅ Complete | Block diagrams, FSM table, BOM |
| D3 | Design Simulation | ✅ Complete | Multisim + TinkerCAD outputs |
| D4 | TinkerCAD Prototype | ⏳ Upcoming | Paste `.ino` into TinkerCAD, demo FSM |
| D5 | Breadboard Prototype | ⏳ Upcoming | HX711 calibration, real Arduino-Jetson serial |
| D6 | Final Design Report | ⏳ Upcoming | Calibration tables, AI metrics, response time |
| D7 | Final Presentation | ⏳ Upcoming | |
| D8 | Innovation Fair | ⏳ Upcoming | Live demo, poster |

---

## Contribution Workflow

1. Create a branch: `git checkout -b feature/your-feature-name`
2. Make changes, verify with screenshot or test output
3. Commit: `git commit -m "feat: short description"`
4. Push and open a Pull Request — requires 1 team member review

Branch naming prefixes: `feature/`, `fix/`, `chore/`, `docs/`

---

## License & Attribution

ECTE 250 — University of Wollongong in Dubai. Academic project, not for commercial use without team consent.

The YOLOv8n model was trained on the public **microplastics-t0ddd** dataset by `uni-oahuo` on Roboflow Universe (CC BY 4.0).
