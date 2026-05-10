# config.py — NurdleDNA Jetson Nano configuration
# Edit this file before deploying. Keep out of version control if it
# contains real Firebase credentials (it is listed in .gitignore).

# ─── Serial (Arduino) ────────────────────────────────────────────
SERIAL_PORT    = "/dev/ttyUSB0"   # or /dev/ttyACM0 — check with: ls /dev/tty*
SERIAL_BAUD    = 115200
SERIAL_TIMEOUT = 1.0              # seconds

# ─── Camera ──────────────────────────────────────────────────────
# USB webcam: CAMERA_INDEX = 0
# Jetson CSI cam (IMX219): CAMERA_INDEX = "nvarguscamerasrc ! ..."
CAMERA_INDEX = 0

# ─── YOLOv8 model ────────────────────────────────────────────────
# Path relative to jetson/ directory. Set to None to use OpenCV fallback.
# Export from Ultralytics: yolo export model=nurdle.pt format=onnx
YOLO_MODEL = "models/nurdle-yolov8n.onnx"
YOLO_CONF  = 0.55    # confidence threshold
YOLO_IOU   = 0.45    # NMS IoU threshold

# ─── Nurdle count → FSM state ────────────────────────────────────
COUNT_WARN = 3    # >= 3 detected nurdles → send WARN to Arduino
COUNT_CRIT = 10   # >= 10 detected nurdles → send CRIT to Arduino

# ─── Firebase ────────────────────────────────────────────────────
# Replace REPLACE_ME values after creating the Firebase project.
# See: https://console.firebase.google.com → Project Settings → General → Web app
FIREBASE_CONFIG = {
    "apiKey":            "REPLACE_ME",
    "authDomain":        "REPLACE_ME.firebaseapp.com",
    "databaseURL":       "https://REPLACE_ME-default-rtdb.firebaseio.com",
    "projectId":         "REPLACE_ME",
    "storageBucket":     "REPLACE_ME.appspot.com",
    "messagingSenderId": "REPLACE_ME",
    "appId":             "REPLACE_ME",
}

DEVICE_ID = "NURDLE-001"
BAY_ID    = "BAY-1"

# Publish to Firebase every N seconds even when state hasn't changed
HEARTBEAT_INTERVAL = 5
