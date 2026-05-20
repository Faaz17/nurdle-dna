# Auto-start the NurdleDNA Jetson Agent on Boot

The Jetson lives inside the prototype enclosure with **no keyboard, mouse, or
monitor** attached during normal operation. This guide installs a `systemd`
service so the agent (`python3 main.py`) starts automatically every time the
Jetson powers on, and restarts itself if it ever crashes.

You only need to follow these steps **once** on each Jetson.

---

## 1. Install the service (one time)

Open a terminal on the Jetson (or SSH in once) and run:

```bash
cd ~/nurdle-dna && git pull
sudo cp jetson/nurdle-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nurdle-agent.service
```

That's it. The service is now installed and running. It will also auto-start
on every future boot.

---

## 2. Confirm it's working

```bash
sudo systemctl status nurdle-agent.service
```

Expected output (green `active (running)`):

```
● nurdle-agent.service - NurdleDNA Jetson Agent (vision + cloud)
     Loaded: loaded (/etc/systemd/system/nurdle-agent.service; enabled)
     Active: active (running) since Fri 2026-05-16 ...
   Main PID: 12345 (python3)
      Tasks: 12
     ...
```

Recent log lines should include:

```
[vision] YOLOv8 ONNX loaded: models/nurdle-yolov8n.onnx
[cloud] Firebase connected → https://nurdle-dna-default-rtdb.firebaseio.com
[vision] Started — YOLOv8 ONNX
[main] All subsystems running.
[cloud] First publish OK → OK (FSM=S1)
```

---

## 3. The real headless test

Pull the barrel-jack power, wait 10 seconds, plug it back in.
**Do not touch keyboard, mouse, monitor, or SSH.** From your phone or any
laptop, open:

> https://faaz17.github.io/nurdle-dna/live-demo.html

Within ~60 seconds the **LIVE** indicator should turn green and the camera
feed should appear. That confirms the entire system started itself with
nothing but power.

---

## What to expect after power-on

| Time after power-on | What happens |
|---|---|
| 0 – 15 s | Jetson boots Ubuntu |
| 15 – 25 s | Wi-Fi connects, network online |
| 25 – 35 s | systemd starts `nurdle-agent.service` |
| 30 – 45 s | Camera opens, YOLO model loads, Firebase connects |
| ~ 45 s | Website live-demo page shows **LIVE** + camera feed |

---

## How to know it's working without a monitor

1. **Website** — phone or laptop on any Wi-Fi: live-demo.html shows green LIVE + camera feed
2. **LCD on the device** — should read `Sys OK` (the Arduino's S1 SysOK state)
3. **Indicator LEDs** — green steady = OK; yellow blinking = Caution; red = ALARM

If the website stays grey for more than 60 seconds, something is wrong —
SSH in and check the logs (see next section).

---

## Diagnostics (when something goes wrong)

```bash
# Is it running? What's the recent state?
sudo systemctl status nurdle-agent.service

# Live tail of the agent's stdout/stderr (Ctrl-C to exit; doesn't stop the service)
journalctl -u nurdle-agent -f

# Last 100 log lines, ignore any colour codes
journalctl -u nurdle-agent -n 100 --no-pager

# Read the persistent log file instead (survives reboots)
tail -f ~/nurdle-agent.log
```

Manual control:

```bash
sudo systemctl stop    nurdle-agent.service   # stop until next boot or manual start
sudo systemctl start   nurdle-agent.service   # start it again
sudo systemctl restart nurdle-agent.service   # quick stop + start

sudo systemctl disable nurdle-agent.service   # don't start on boot any more
sudo systemctl enable  nurdle-agent.service   # re-enable boot start
```

To update to the latest code and restart cleanly:

```bash
cd ~/nurdle-dna && git pull
sudo systemctl restart nurdle-agent.service
```

---

## Uninstall (if you ever need to)

```bash
sudo systemctl disable --now nurdle-agent.service
sudo rm /etc/systemd/system/nurdle-agent.service
sudo systemctl daemon-reload
```
