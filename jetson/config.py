# config.py — NurdleDNA Jetson Nano configuration
# Edit this file before deploying. Keep out of version control if it
# contains real Firebase credentials (it is listed in .gitignore).

# ─── Serial (Arduino) ────────────────────────────────────────────
SERIAL_PORT    = "/dev/ttyUSB0"   # or /dev/ttyACM0 — check with: ls /dev/tty*
SERIAL_BAUD    = 115200
SERIAL_TIMEOUT = 1.0              # seconds

# ─── Camera ──────────────────────────────────────────────────────
# Default: USB webcam (/dev/video0 on Jetson, or laptop's built-in cam)
CAMERA_INDEX = 0

# Fallback for Jetson CSI camera (IMX219). Uncomment if you swap cameras:
# CAMERA_INDEX = (
#     "nvarguscamerasrc sensor-id=0 ! "
#     "video/x-raw(memory:NVMM), width=1280, height=720, framerate=30/1 ! "
#     "nvvidconv flip-method=0 ! "
#     "video/x-raw, format=BGRx ! "
#     "videoconvert ! video/x-raw, format=BGR ! "
#     "appsink drop=true sync=false"
# )

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
    "apiKey":            "AIzaSyB-QMnzLJoCEM9pGhtU1Rlg7qpxlypRIRk",
    "authDomain":        "nurdle-dna.firebaseapp.com",
    "databaseURL":       "https://nurdle-dna-default-rtdb.firebaseio.com",
    "projectId":         "nurdle-dna",
    "storageBucket":     "nurdle-dna.firebasestorage.app",
    "messagingSenderId": "191553323886",
    "appId":             "1:191553323886:web:129530e9db0b1ea349b77f",
}

DEVICE_ID = "NURDLE-001"
BAY_ID    = "BAY-1"

# Publish to Firebase every N seconds even when state hasn't changed
HEARTBEAT_INTERVAL = 5
