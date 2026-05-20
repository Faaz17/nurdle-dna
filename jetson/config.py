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
YOLO_CONF  = 0.25    # demo: lowered from 0.40 so weak detections still count
YOLO_IOU   = 0.45    # NMS IoU threshold

# Hybrid detection — combine YOLO with HSV white-object fallback so the demo
# also reacts to generic white items (paper, foam, beads), not only microplastics.
HYBRID_HSV = True

# ─── Nurdle count → FSM state ────────────────────────────────────
COUNT_WARN = 2    # demo: lowered from 4 so badge flips yellow quickly
COUNT_CRIT = 6    # demo: lowered from 12 so ALARM fires with just a few pellets

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

# ─── Live camera stream → website ─────────────────────────────────
# Throttled JPEG snapshots written to /devices/NURDLE-001/snapshot.
STREAM_CAMERA   = True   # set False to disable the live feed
STREAM_INTERVAL = 1.0    # seconds between snapshots (1 fps default)
STREAM_WIDTH    = 320    # snapshot width in px (height auto from aspect ratio)
STREAM_QUALITY  = 60     # JPEG quality 0-100 (60 is a good size/clarity balance)
