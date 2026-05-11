# NurdleDNA — System Architecture

How every piece fits together, end to end.

---

## 30-second summary

A two-processor industrial water sensor (Arduino + Jetson Nano), a real-time Firebase database, and a static dashboard served from GitHub Pages. Detections flow upward from the camera, control commands flow downward to the valve, and audit-grade events are immutably logged in the cloud.

---

## Component diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                       PHYSICAL DEVICE                            │
│                                                                  │
│  Water → [Flow cell + camera + UV LED]    [MQ-135 in headspace]  │
│            │                                       │             │
│            ▼ frame                                 │ ADC          │
│       ┌──────────┐                                 │             │
│       │  Jetson  │   USB serial JSON (115200)      │             │
│       │  Nano    │ ◄──────────────────────────► ┌──┴───────┐    │
│       │  ──────  │                              │ Arduino  │    │
│       │ YOLOv8n  │                              │   Uno    │    │
│       │ OpenCV   │                              │ ──────── │    │
│       │ pyrebase │                              │ FSM      │    │
│       └─────┬────┘                              │ Servo    │    │
│             │                                   │ LCD/LEDs │    │
│             │                                   │ Buzzer   │    │
│             │                                   │ HX711    │    │
│             │                                   └────┬─────┘    │
│             │                                        │          │
│             │                                        ▼          │
│             │                                  [Servo valve]    │
│             │                                  [Load cell]      │
│             │                                  [LCD display]    │
│             │                                  [RGB LEDs]       │
│             │                                  [Buzzer]         │
│             ▼                                                    │
│      HTTPS                                                       │
└──────┬──────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│       Firebase Realtime DB          │
│                                     │
│   /devices/NURDLE-001  (snapshot)   │
│   /events/{push-key}   (audit log)  │
└──────┬──────────────────────────────┘
       │ WebSocket subscription
       ▼
┌─────────────────────────────────────┐
│      Static website (GH Pages)      │
│                                     │
│   index.html         landing        │
│   live-demo.html     control panel  │
│   events.html        audit log      │
│   digital-twin.html  3D scene       │
│   cad-model.html     CAD viewer     │
└─────────────────────────────────────┘
```

---

## Data flow — when nurdles are detected

```
[t = 0 ms]   Camera frame captured by Jetson
[t = 50 ms]  YOLOv8n inference completes: count=12, conf=0.87
[t = 50 ms]  vision.py → main.py → "CRIT" state
[t = 200 ms] Jetson sends {"state":"CRIT","confidence":0.87,"count":12}
             over USB serial to Arduino
[t = 400 ms] Arduino has now received 3 consecutive CRIT commands
             → FSM transitions S1 → S3 (latched)
[t = 410 ms] Servo closes valve (90°), red LED on, buzzer on, LCD updates
[t = 600 ms] Arduino telemetry: {"fsm_state":"S3","valve":"CLOSED",...}
[t = 1000 ms] cloud.py merges telemetry + vision → Firebase publish
              Path: /devices/NURDLE-001 (state=ALARM)
              Path: /events/{push-key}  (immutable event entry)
[t = 1050 ms] Website live-demo page receives Firebase update
              → flips to LIVE mode, paints S3 red, logs event row
[t = 1050 ms] Website events page receives /events child_added
              → new alarm row appears at top of table

Total time from detection to dashboard: ~1 second.
```

---

## Process model on the Jetson

`main.py` spawns 3 daemon threads + a main loop:

```
┌────────────────────────────────────────────────────────────────┐
│ main thread        5 Hz                                        │
│                    while True:                                 │
│                        send vision result to Arduino           │
│                        sleep 200ms                             │
├────────────────────────────────────────────────────────────────┤
│ vision thread      camera read → YOLOv8 / OpenCV → state       │
│                    runs as fast as camera + GPU allow          │
├────────────────────────────────────────────────────────────────┤
│ serial thread      while True:                                 │
│                        read serial bytes                       │
│                        parse JSON lines                        │
│                        update shared telemetry dict            │
├────────────────────────────────────────────────────────────────┤
│ cloud thread       1 Hz                                        │
│                    while True:                                 │
│                        get_state() → build payload             │
│                        if state changed or heartbeat due:      │
│                            publish to Firebase                 │
│                        sleep 1s                                │
└────────────────────────────────────────────────────────────────┘
```

All threads are daemons → exit cleanly on Ctrl+C (or systemd stop).

---

## Failure modes & graceful degradation

The system is designed to **degrade gracefully** rather than crash:

| Failure | What happens | Recovery |
|---------|--------------|----------|
| No camera | `cv2.VideoCapture` fails, thread busy-loops | OpenCV fallback can't run; FSM still uses Arduino-local sensor data |
| No YOLO model file | Auto-falls back to OpenCV HSV detector | Set `YOLO_MODEL` in config.py to use ONNX once available |
| No Arduino connected | Serial thread retries every 5s forever | Replug Arduino → auto-reconnects |
| Firebase offline | `cloud.py` prints offline payload to stdout | Re-connects when network returns; no data lost during offline window |
| Website offline | live-demo falls back to local FSM simulator | Reconnects automatically; netLed turns green |
| LCD blank | Address mismatch (0x27 vs 0x3F) | Edit `LCD_ADDR` in `.ino` and re-flash |

**Single point of failure today:** Firebase project (`nurdle-dna`). If that project is deleted, both Jetson and website lose their connection point. Mitigation: keep service account key offline as a backup.

---

## Threading & state safety

| Resource | Owned by | Synchronisation |
|----------|----------|----------------|
| `VisionAgent.{count,confidence,state}` | vision thread | `threading.Lock()` around read/write |
| `SerialBridge.telemetry` (dict) | serial thread | dict update is GIL-atomic; reads return a copy |
| `SerialBridge._serial.write()` | main thread | `threading.Lock()` around write |
| `CloudPublisher._last_status` | cloud thread | single-threaded inside its own loop |

The website's live-demo simulation and Firebase listener could potentially race if Firebase data arrives mid-tick. Mitigated by `sim.liveMode` gating — once liveMode is true, the simulation tick early-returns without touching `sim.sensors`.

---

## Security model

- **Firebase web SDK credentials** (`apiKey`, `databaseURL`, etc.) are **safe to commit publicly**. They are not secrets — security is enforced by Firebase Realtime Database **Rules** in the Firebase console, not by hiding the key.
- **Service account key** (`jetson/serviceAccountKey.json`) **IS secret** — gitignored, must never be committed. It grants write access bypassing rules.
- **Roboflow API key** is a personal token. Don't share or commit it; regenerate if leaked.

Recommended Firebase rules for production:
```json
{
  "rules": {
    ".read": true,
    "devices": {
      "$device": {
        ".write": "auth != null"
      }
    },
    "events": {
      ".write": "auth != null",
      ".indexOn": ["timestamp"]
    }
  }
}
```

Currently set to test mode (`.read: true, .write: true`) for development.

---

## Why these technology choices?

| Decision | Reason |
|----------|--------|
| **Two processors** instead of one | Arduino has deterministic real-time servo control; Jetson has the GPU for vision. Separation of concerns. |
| **USB serial JSON** instead of I2C/SPI | USB is what the Jetson natively exposes to the Arduino; JSON is readable in the serial monitor for debugging. |
| **Firebase Realtime DB** instead of Firestore | Realtime DB is genuinely real-time (websocket push), better latency for live dashboard. Firestore is better for complex queries but slower. |
| **Vanilla JS + Three.js** instead of Next.js | No build step, deploys directly to GitHub Pages, no Node runtime needed, easy for team to edit and view changes immediately. |
| **YOLOv8n** instead of YOLOv8s/m/l | "n" = nano. Smallest and fastest, runs in real-time on Jetson Nano. Accuracy trade-off acceptable for count-based alarm triggering. |
| **ONNX** instead of PyTorch | Portable across hardware. Doesn't require torch on the Jetson (which is a pain to install on JetPack 4.x). |
| **Google Colab** for training | Free GPU (T4), zero local setup, no team member needs CUDA on their laptop. |

---

## What this architecture deliberately doesn't do

- **No video streaming to the cloud.** Privacy concern + bandwidth waste. Only metadata is sent.
- **No on-device storage of camera frames.** Same reason.
- **No federated learning / on-device retraining.** Out of scope for an undergrad project. The model is trained once in Colab and deployed.
- **No multi-device routing.** One Firebase node = one physical device. To scale, deploy multiple Firebase paths (e.g. `/devices/NURDLE-002`) — the website's events page already handles this via the `device_id` field.
