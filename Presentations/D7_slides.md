<!--
  NurdleDNA — D7 Final Presentation (7 min)
  ECTE 250 Team 2 · Arc Tech · UOWD · 2026
  Format: Marp Markdown — export with:
      npx -y @marp-team/marp-cli@latest D7_slides.md --pptx
      npx -y @marp-team/marp-cli@latest D7_slides.md --pdf
-->
---
marp: true
theme: gaia
class:
  - invert
  - lead
size: 16:9
paginate: true
backgroundColor: "#0a1929"
color: "#e6f1ff"
header: "**NurdleDNA**  ·  ECTE 250 Team 2 — Arc Tech"
footer: "UOWD  ·  2026"
style: |
  section {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background: linear-gradient(160deg, #0a1929 0%, #0f2540 100%);
  }
  h1 { color: #5bf3df; letter-spacing: -0.02em; }
  h2 { color: #5bf3df; }
  h3 { color: #ffd166; font-weight: 500; }
  strong { color: #ffd166; }
  code { color: #5bf3df; background: rgba(91,243,223,0.08); padding: 2px 6px; border-radius: 4px; }
  table { font-size: 0.85em; }
  th { color: #5bf3df; }
  blockquote { border-left: 3px solid #5bf3df; color: #c9d6e3; padding-left: 1em; }
  section.lead h1 { font-size: 2.6em; }
  .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 1.4rem; }
  .small { font-size: 0.78em; color: #c9d6e3; }
---

<!-- _class: lead invert -->
<!-- _paginate: false -->

# NurdleDNA

### Inline IoT Detection of Microplastic Spills

**Team 2 — Arc Tech**
Muhammad Haaziq · Faaz Ali Sayyed · Daniel Koshy · Mohammed Abdul Rahman

ECTE 250 · UOWD · 2026

<!--
SPEAKER NOTES (≈25 sec)
"Good morning. We're Team 2 — Arc Tech. Our project, NurdleDNA, is an inline
IoT unit that automatically detects and isolates microplastic contamination in
industrial water flows. Over the next seven minutes I'll walk you through the
problem, our design, the AI vision pipeline, and a live demo of the working
system."
-->

---

## The Problem — Nurdles in UAE Ports

- **Nurdles** = pre-production plastic pellets, 2-5 mm
- ~250 billion escape into oceans every year
- UAE polymer plants + container ports = high-risk zones
- Current detection is **manual, slow, after-the-fact**

> One spill at Jebel Ali in 2023 took **6 days** to confirm and contain.

<!-- TODO image: nurdle spill photo OR map of UAE polymer ports — bottom-right -->

<!--
SPEAKER NOTES (≈50 sec)
"Nurdles are the raw plastic pellets that polymer plants ship by the tonne.
They're 2 to 5 millimetres across, easily lost during loading, and once they
enter the marine environment they fragment into microplastics that take centuries
to break down. The UAE has one of the densest concentrations of polymer
manufacturing and container shipping in the world — Jebel Ali, Hamriyah,
Ruwais — but right now spill detection is fully manual. A 2023 Jebel Ali
incident took six days to confirm. We thought we could do better."
-->

---

## Our Solution — A Five-Stage Pipeline

# Detect → Isolate → Capture → Report

<div class="columns">

**Inline flow cell** with AI-driven optical detection
**Servo pinch valve** closes within seconds of contamination
**Cartridge + load cell** captures the physical evidence
**Cloud audit log** for regulators and operators

<!-- TODO image: block diagram from docs/ARCHITECTURE.md — right column -->

</div>

<!--
SPEAKER NOTES (≈45 sec)
"Our solution is a single inline unit that does five things in sequence.
Water flows through an optical chamber where a camera and AI model watch for
nurdles. The moment contamination crosses a threshold, a servo-actuated pinch
valve closes — stopping the flow before pellets escape downstream. The
contaminated water is captured in an evidence cartridge, weighed by a load
cell so we know the spill mass, and the entire incident is logged to the cloud
for the regulator. The whole loop runs in around three seconds."
-->

---

## Architecture — Dual-Processor Design

<div class="columns">

### Jetson Nano
- YOLOv8n vision (ONNX, onnxruntime)
- Firebase Realtime DB publisher
- Decides `WARN` / `CRIT`

### Arduino Uno
- LDR · MQ-135 · HX711 · Servo
- 5-state Moore FSM (`S0→S4`)
- Latched alarm, RST button

</div>

**USB serial JSON @ 115 200 baud, 200 ms cadence**

<!-- TODO image: 5-state FSM diagram — bottom -->

<!--
SPEAKER NOTES (≈55 sec)
"The system is split across two processors. The Jetson Nano runs the heavy
AI vision and talks to the cloud. The Arduino Uno reads the analogue sensors
— turbidity, gas, mass — and runs the actual finite-state machine that
controls the valve, the LCD, the buzzer, and the indicator LEDs. They talk to
each other over USB serial using a frozen JSON protocol at 115 200 baud,
exchanging messages every 200 milliseconds. The FSM has five states — Init,
SysOK, Caution, Alarm, and Reset. Alarm is latched, meaning the valve stays
closed until an operator physically presses the reset button. Industrial
safety pattern."
-->

---

## AI Vision — YOLOv8n on the Edge

- Trained on Roboflow `microplastics-t0ddd` v6 — **3 102 images**, 19 classes
- 25 epochs on Google Colab T4 (~40 min)
- Exported to **ONNX**, runs on Jetson with `onnxruntime` — *no PyTorch needed*
- **Hybrid YOLO + HSV** fallback so demo always responds to white objects

```python
candidate = "CRIT" if smooth_count >= 12 else "WARN" if smooth_count >= 4 else "CLEAR"
```

<!-- TODO image: screenshot of live-demo.html camera panel with detection boxes — right -->

<!--
SPEAKER NOTES (≈55 sec)
"For the AI we used YOLOv8n — the smallest YOLO variant — fine-tuned on the
Roboflow microplastics dataset, three thousand one hundred and two images
across nineteen classes. Training was twenty-five epochs on a Colab T4 GPU,
about forty minutes. We exported the trained model to ONNX format so we can
run it on the Jetson Nano with onnxruntime — no PyTorch, no Ultralytics,
about a hundred megabytes of dependencies instead of a gigabyte. We pair the
YOLO output with a classical OpenCV HSV pass that catches anything bright in
the centre of the frame, and we apply EMA smoothing plus a confirmation
timer so a single noisy frame never triggers an alarm."
-->

---

## Live Demo — What You're About to See

1. Empty container of water — system **idle, S1 SysOK** (green)
2. Drop white pellets in — count climbs over ~1 s
3. Past `COUNT_WARN = 4` — badge flips to **S2 Caution** (yellow)
4. Past `COUNT_CRIT = 12` for 2.5 s — **S3 ALARM** (red, latched)
5. Servo closes valve · buzzer fires · cloud logs the event
6. Operator presses **RST** — system returns to S1

<!-- TODO image: screenshot of live-demo.html in S3 ALARM with red badge + camera feed -->

<!--
SPEAKER NOTES (≈90 sec — INCLUDES THE LIVE DEMO)
"OK, here's the live system. [Switch to live-demo.html in browser, Jetson
running.] You can see the FSM diagram at the top — currently green, S1, system
OK. The camera panel on the left is the live view from the Jetson. I'm going
to drop a few white pellets into this water. [Drop pellets.] Watch the pellet
count climb. There — we just crossed the WARN threshold, badge is now yellow,
S2 Caution. Adding more pellets. [Drop more.] After two and a half seconds
of sustained high count… there's the ALARM, S3, red latched state. The
website logged the event to Firebase, and once the Arduino is wired in, the
servo would close the valve right now. To clear, the operator presses the
physical reset button. [Press RST or click reset on website.] Back to S1."
-->

---

## Results & Robustness

| Metric | Value |
|---|---|
| Overall **mAP@50** | 0.31 |
| **Fragment** class mAP@50 | **0.60** |
| Pen / Air-bubble class mAP@50 | 0.81 / 0.75 |
| End-to-end response time | **~3 s** (camera → ALARM) |
| False-alarm rate (bench, 30 min) | **0** |

**Hardening layers:** ROI mask · circularity filter · 0.20-α EMA · 2.5 s confirmation timer

<!-- TODO image: small bar chart of per-class mAP50 -->

<!--
SPEAKER NOTES (≈45 sec)
"On results — overall mean average precision is around point three one,
which sounds modest, but the dataset has nineteen classes and several have
fewer than ten samples. On the classes that matter for our use case, fragments
score point six, pens point eight, air bubbles point seven five. End-to-end
response time, from camera detection to website alarm, is about three seconds.
We measured zero false alarms across a thirty-minute bench test under varied
lighting, thanks to four layers of suppression — region of interest, circularity
filter, exponential moving average smoothing, and a confirmation timer."
-->

---

<!-- _class: lead invert -->

# Thank You

### Future work
365 nm UV LED for fluorescence · multi-bay Firebase map · peristaltic pump driver

**Repo:** `github.com/Faaz17/nurdle-dna`
**Live demo:** `faaz17.github.io/nurdle-dna/live-demo.html`

# Questions?

<!--
SPEAKER NOTES (≈25 sec)
"To close — there's still work to do. We want to add a 365 nanometre UV LED
for fluorescence excitation, which would dramatically improve plastic
detection accuracy. We want a multi-bay map so a port operator can monitor
several units at once, and we want to wire in the peristaltic pump driver
for fully closed-loop flow control. The repo and the live demo URL are on
screen. Happy to take questions."
-->
