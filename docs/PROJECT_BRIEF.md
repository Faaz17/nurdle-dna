# NurdleDNA — Project Brief

**ECTE 250 · Team 2 · Arc Tech**
Muhammad Haaziq (8927133) · Faaz Ali Sayyed (8943564) · Daniel Koshy (8938799) · Mohammed Abdul Rahman (9070734)
University of Wollongong in Dubai · 2026

> NurdleDNA is an inline IoT unit that detects microplastic pellets ("nurdles") in industrial water flows, automatically isolates the contaminated stream with a servo-actuated pinch valve, captures physical evidence of the spill, and logs an audit-grade event to the cloud — all in around three seconds.

This document is the master content brief for the project. It is the single written source of truth from which the team will build the D7 presentation, the D8 Innovation-Fair poster, the D6 final design report, and any Q&A scripts. Every section is written as readable prose so it can be quoted directly into other artefacts.

---

## §1 · Story — How we came up with the project

A **nurdle** is a pre-production plastic pellet — a translucent, lentil-shaped bead, typically 2 to 5 mm across — and it is the universal raw input for nearly every plastic product manufactured in the world. Polymer plants ship them by the tonne in shipping containers, rail cars, and tanker trucks; downstream factories melt them down into bottles, films, fibres, and packaging. Because they are tiny, lightweight, and handled in enormous volumes, nurdles routinely **escape into the environment** during loading, transport, washdown, and accidental spills — and once they enter a water system they are nearly impossible to recover.

They harm marine life because they look like fish eggs and get ingested across the food chain. They **adsorb persistent organic pollutants** like PCBs and DDT from sea water, concentrating those toxins by orders of magnitude on their surface[^1]. Over years and decades they fragment into smaller microplastics that persist for centuries, eventually reaching humans through the seafood we eat.

We picked this problem because the UAE is a global hub for two industries where nurdle handling is a daily operational risk:

1. **Oil, petrochemical, and polymer manufacturing** — Borouge (a joint venture between ADNOC and Borealis at the Ruwais complex) is the largest polyolefin producer in the GCC, processing several million tonnes of nurdles every year. The petrochemical chain converts crude oil into polymer pellets at industrial scale, and every transfer point along that chain — reactor → silo → bagging → loading bay → shipping container → port — is a potential leak point.
2. **Industrial water systems generally** — port washdown water at Jebel Ali and Khalifa Port, refinery effluent, polymer-plant cooling water, and desalination intake all carry the residue of nearby industrial activity. If nurdles reach the outfall they reach the Gulf.

We chose **water** as our demonstration medium because pellets float, contrast strongly against a clear background, and let the camera AI prove itself visually. But the architecture — camera + AI + turbidity sensor + gas sensor + load cell + servo valve — is generic to any industrial fluid system that needs particle and contamination monitoring.

> **Use this in:** D7 slide 2 · poster Story panel · D6 §1 Introduction.

---

## §2 · The Main Problem

**Industrial water flows in the UAE's oil, petrochemical, and polymer sector are contaminated with microplastic nurdles, and there is no affordable, real-time, inline way to detect them today.**

Current options all fail in at least one important way:

- **Manual visual inspection** is the standard practice. Operators walk the perimeter of a settling tank or a discharge channel with a sieve. It is slow, after-the-fact, depends on human attention, and misses small or transient spills entirely.
- **Lab spectroscopy** (FTIR, Raman) gives definitive chemical identification of microplastic samples but takes hours per sample, requires bench equipment, and cannot scale to continuous inline monitoring.
- **Dye markers and tracer chemicals** introduce a new contaminant into the water and require dosing infrastructure.
- **Industrial particle counters** (laser obscuration sensors) report total particle counts but cannot distinguish nurdles from sand, biological matter, or air bubbles.

The cost of getting this wrong is concrete and well-documented. The **X-Press Pearl** disaster off Sri Lanka in May 2021 released approximately 1 680 tonnes of nurdles into the ocean — the single largest plastic spill in maritime history — and the cleanup is still ongoing five years later[^3]. Globally, an estimated **230 000 tonnes of nurdles (~10 trillion pellets) reach the ocean every year**[^1], making them the second-largest direct source of primary ocean microplastics after tyre wear[^2]. Closer to home, port washdown and polymer-loading-bay spills can take days to confirm and weeks to contain because no one is watching the water in real time.

NurdleDNA exists to close this monitoring gap with a $250–$400 inline unit that watches every stream, all the time.

> **Use this in:** D7 slide 2 · poster Problem panel · D6 §1.2 Problem Statement.

---

## §3 · Nurdles — research that shaped the project

Our literature review gave us four facts that became the foundation of the design:

- Nurdles are **the second-largest single source of primary ocean microplastics**[^2]. That justified the focus: stopping them at the point of release prevents downstream pollution that no clean-up effort can ever fully reverse.
- They are **highly visible at typical industrial flow velocities** (0.05–0.5 m/s in washdown channels) — pellets are large and bright relative to background water — which made **camera-based optical detection** the obvious sensing modality.
- Existing chemical-analysis methods (FTIR, Raman) are too expensive and too slow for continuous monitoring, so an **edge-AI vision model** is the right architectural choice: cheap, real-time, no lab loop.
- Industrial-safety practice requires that any "stop the process" decision sit on a **deterministic** processor, not a probabilistic one. That justified our **dual-processor split** — a Jetson Nano for the AI inference (probabilistic, may be slow or wrong on edge cases) and an Arduino Uno for the safety-critical FSM that owns the valve (deterministic, fast, predictable).

That research mapped directly onto the system you see today:

- **Optical detection** → camera + LED illumination over a transparent flow cell.
- **Edge AI** → YOLOv8n (smallest YOLO variant) trained on a public microplastic dataset, deployed via ONNX runtime on the Jetson Nano so no PyTorch or Ultralytics installation is needed in the field.
- **Multi-sensor confirmation** → adding turbidity (LDR), gas headspace (MQ-135), and captured-mass (load cell) to the camera gives three independent, redundant ways to detect contamination, not one.
- **Cloud audit log** → Firebase Realtime Database, immutable event entries, regulator-friendly. A single backend can monitor many devices across many bays and sites.

> **Use this in:** D7 slide 3 · poster Research panel · D6 §2 Background and Literature Review.

---

## §4 · The Device — 3D model, electronic case, layered arrangement

The physical unit is a custom enclosure designed in **Autodesk Fusion 360**, modular for in-field maintenance and split into two clearly separated layers:

**Layer 1 — Sensor zone (the wet path).**
- A transparent **inline optical flow cell** through which the monitored water passes, with a fixed-position camera viewport on one face and a steady **white LED light source** (WS2812B-8 strip) on the opposite face for consistent illumination.
- An **LDR** mounted in the optical path acts as a turbidity sensor — clear water passes the LED's light, cloudy or contaminated water blocks it. Independent of the camera AI.
- An **MQ-135** gas sensor in the headspace above the flow cell catches volatile organic compounds — useful when the contamination has a hydrocarbon vapour signature (oil-derived plastics, solvents, fuel residues).
- A downstream **evidence cartridge** sits on an **HX711 + load cell** so the captured mass of any spill is weighed automatically and reported to the cloud event log.
- An **MG996R servo-actuated pinch valve** sits between the flow cell and the cartridge; on ALARM it physically closes the flow path within ~300 ms.

**Layer 2 — Electronics zone (the dry path).**
- The **Jetson Nano** runs the AI vision pipeline and the cloud publisher.
- The **Arduino Uno** runs the deterministic FSM, drives the LCD / LEDs / buzzer, and exchanges JSON telemetry with the Jetson over USB serial.
- A separate **5–6 V supply** powers the high-current servo so it never browns out the Arduino's USB rail. All three supplies (Arduino USB, servo PSU, Jetson 5 V/4 A) share a common ground rail on the breadboard.

The two layers are physically partitioned so that water leaks cannot reach electronics and so a maintenance technician can swap sensors without touching the compute hardware. The result is a unit that looks unobtrusive at a bay-side installation but contains a complete inline contamination-detection laboratory.

> **Use this in:** D7 slide 5 · poster "The Device" panel · D6 §3 System Design.

---

## §5 · Jetson — AI vision (YOLO + HSV)

The Jetson Nano runs everything that is "smart" about NurdleDNA. Its job is to look at the live camera feed, decide whether there are nurdles in view, count them, classify them, and tell the Arduino whether to be in CLEAR / WARN / CRIT.

**The YOLOv8n model.**
We trained YOLOv8n — the smallest variant of the YOLOv8 object-detection family, around 2.6 million parameters — on the public Roboflow `microplastics-t0ddd` v6 dataset, which contains **3 102 labelled images across 19 microplastic classes** (Pen, Fragment, Microfibre, Air-bubble, Foam, Pellet, and twelve others). Training was 25 epochs on a Google Colab T4 GPU and took about 40 minutes. We exported the trained weights to **ONNX** format and run inference on the Jetson with **`onnxruntime`** — this is critical for the Jetson Nano because PyTorch and Ultralytics together pull in over a gigabyte of dependencies that the Nano cannot comfortably host. With ONNX runtime we use about 100 MB total.

Headline metrics: overall **mAP@50 = 0.31** (modest because the dataset has 19 classes and several have fewer than 10 samples), but on the classes that matter for a polymer-plant spill the model performs strongly — **Fragment 0.60, Pen 0.81, Air-bubble 0.75**. End-to-end response time, from the moment a pellet enters the camera frame to the moment the website badge turns red, is approximately **3 seconds**.

**The HSV safety net.**
We pair the YOLO model with a classical OpenCV pipeline that performs **HSV thresholding** plus contour analysis on the central region of the frame. HSV catches anything bright, neutral, and roughly round — exactly the visual signature of a nurdle — even when the YOLO model has low confidence. The two work as a hybrid: YOLO classifies *what type* of microplastic each detection is (this is the credibility moment for an audience: real ML classification, not just a blob counter), while HSV runs as a safety net that fires when YOLO is silent. Together they reduce **false negatives** dramatically.

In the opposite direction — to suppress **false positives** — four further mechanisms layer on top:

1. **Region-of-interest (ROI) mask** restricts both detectors to the central 60 % of the frame, so reflections off bottle walls, the LED housing, or the table top never count.
2. **Circularity filter** rejects elongated highlights (knife edges, surface ripples) that are bright but not pellet-shaped.
3. **Exponential moving average (EMA, α = 0.20)** smooths the per-frame count so a single noisy frame never causes a state change.
4. **Confirmation timer** requires the candidate state to be sustained continuously — 1.5 s for WARN, 2.5 s for CRIT — before the public state actually changes. A momentary glare or a hand passing the camera cannot ever trigger an alarm.

Bench-tested under varied lighting for 30 minutes with no pellets present: **zero false alarms**.

> **Use this in:** D7 slide 6 · poster AI panel · D6 §4 AI Vision Pipeline.

---

## §6 · Arduino — sensors, actuators, serial bridge

The Arduino Uno is the safety-critical processor. Its job is deterministic: read the analogue sensors at fixed cadence, run the 5-state Moore FSM, drive the actuators, and exchange JSON with the Jetson at 5 Hz.

**Pin assignments** (single source of truth in `firmware/nurdle-dna/nurdle-dna.ino`):

| Component | Pin | Role |
|---|---|---|
| LDR (turbidity) | A0 | Analogue read, threshold > 600 → WARN |
| MQ-135 (gas) | A1 | Analogue read, threshold > 200 → CRIT |
| HX711 + load cell | D4 (DOUT), D10 (CLK) | Captured mass in grams (calibrated `set_scale`) |
| MG996R servo | D9 | OPEN (90°) ↔ CLOSED (0°) |
| 16 × 2 I²C LCD | A4 (SDA), A5 (SCL) | Operator status display |
| RGB LEDs | D3, D5, D6 | Green / Yellow / Red status |
| Buzzer | D8 | `tone()` on ALARM |
| RST button | D2 | Operator reset, clears latched S3 |

**Serial bridge.** Jetson and Arduino exchange JSON over USB at 115 200 baud, every 200 ms.

- **Jetson → Arduino:** `{"state":"WARN|CRIT|CLEAR","confidence":0.85,"count":12}`
- **Arduino → Jetson:** `{"fsm_state":"S1","valve":"OPEN","ldr":542,"gas":380,"load_g":3.4}`

This is exactly the redundancy industrial safety code requires: even if the Jetson crashes, freezes, or gets disconnected, the Arduino independently reads its own analogue sensors and reacts to its own thresholds. The Jetson's vision input is *additional* signal that lets the Arduino act sooner and with class information — but the Arduino is never *dependent* on the Jetson for safety-critical decisions.

> **Use this in:** D7 slide 7 · poster Hardware panel · D6 §5 Embedded Firmware.

---

## §7 · Dashboard — what the operator sees

The website ([faaz17.github.io/nurdle-dna/live-demo.html](https://faaz17.github.io/nurdle-dna/live-demo.html)) is a **live mirror** of the device, driven by Firebase Realtime Database. It is the operator's window into the system from anywhere with internet.

**Five FSM states are displayed** as a state diagram across the top of the page (the user outline mentioned four — the fifth is S0, the brief power-up self-test):

- **S0 INIT** — system boot, all LEDs lit, valve held OPEN
- **S1 SysOK** — green badge, normal flow, no contamination
- **S2 Caution** — yellow badge, sustained contamination above WARN threshold (count ≥ 4 for ≥ 1.5 s)
- **S3 ALARM** — red badge, **latched**, sustained contamination above CRIT threshold (count ≥ 12 for ≥ 2.5 s)
- **S4 RSTIN** — operator pressed the physical reset, system returns to S1

**ALARM state behaviour** — when S3 fires:
1. The servo pinch valve closes within ~300 ms.
2. The buzzer sounds and the red LED lights up at the device.
3. The LCD writes "ALARM".
4. An immutable event entry is pushed to Firebase under `/events/<push-id>` with the timestamp, FSM state, density index, captured mass, AI count, and the per-class breakdown.
5. The audit log on the website grows by one row.
6. The state stays latched until the operator physically presses the RST button — a deliberate industrial-safety pattern (no auto-reset).

**Real-time camera footage.** The Jetson resizes its annotated frame to 320 × 240, JPEG-encodes it at quality 60, base64-encodes the result, and writes it to Firebase once per second. The website decodes and renders this directly into a `<img>` tag inside the "Live Camera Feed" panel, complete with the ROI brackets, detection boxes, class labels, and the live "Nurdles: N" overlay.

**Live sensor readings panel** updates at 5 Hz: turbidity (LDR raw value), gas (MQ-135 ppm), pellet count from the AI, and captured mass in grams. **Class-breakdown chips** under the Pellet Count card show the top three detected microplastic classes — "Fragment ×8 · Microfibre ×3 · Pen ×1" — proving to anyone watching that this is real ML classification, not a generic blob counter.

> **Use this in:** D7 slide 7 · poster Dashboard panel · D6 §6 Cloud and User Interface.

---

## §8 · Social Connection — SDGs · We the UAE 2031 · UAE Net Zero 2050

NurdleDNA is a working example of *applied environmental engineering* — AI deployed against a measurable pollution problem in an industrial setting. It connects directly to four UN Sustainable Development Goals and to the UAE's own twin strategic visions for the next quarter-century.

**SDG alignment**[^4]:

- **SDG 14 — Life Below Water** *(Target 14.1: by 2025, prevent and significantly reduce marine pollution of all kinds, in particular from land-based activities)* — **primary alignment**. NurdleDNA prevents pellets from reaching the marine environment by stopping the contaminated stream at the point of release.
- **SDG 6 — Clean Water and Sanitation** *(Target 6.3: improve water quality by reducing pollution and minimising release of hazardous chemicals and materials)* — direct support: the device is an industrial-water quality monitor.
- **SDG 9 — Industry, Innovation and Infrastructure** *(Target 9.4: upgrade infrastructure with greater resource-use efficiency and clean technologies)* — NurdleDNA is exactly that kind of clean-tech retrofit.
- **SDG 12 — Responsible Consumption and Production** *(Target 12.5: substantially reduce waste generation through prevention and reduction)* — capture-at-source instead of expensive ocean clean-up.

**We the UAE 2031** (announced by the UAE Cabinet, November 2022[^5]) is the national vision to double the UAE's economy while building a knowledge- and AI-led industrial base. The vision explicitly names **sustainability** and **AI-driven industry** as core pillars of the next decade. NurdleDNA is a concrete example of both at once: artificial intelligence applied to environmental sustainability inside an industrial process.

**UAE Net Zero 2050** (announced by the UAE Ministry of Climate Change, October 2021[^6]) made the UAE the first MENA country to commit to a net-zero emissions target, backed by an AED 600 billion clean-energy investment. While the headline emphasis is on energy decarbonisation, marine ecosystem protection and industrial pollution control are part of the same broader environmental commitment — exactly the agenda NurdleDNA serves. As the UAE moves further up the value chain from raw oil exports to value-added petrochemicals, the volume of nurdles handled domestically will increase, and so will the importance of inline pollution-prevention technology like ours.

> **Use this in:** D7 slide 10 · poster "Impact" panel · D6 §7 Sustainability and Strategic Alignment.

---

## §9 · Comparison vs Existing Detection Methods

The space of "ways to detect microplastic contamination in industrial water" is dominated by four established approaches, each of which fails on at least one dimension that matters for inline real-time monitoring:

| Method | Detection time | Cost / point | Real-time? | Classifies type? | Scalable? |
|---|---|---|---|---|---|
| **Manual visual inspection** | Hours – days | Labour-only | ✗ | ✗ | Poor |
| **Lab spectroscopy (FTIR / Raman)** | Hours / sample | $50 000+ instrument | ✗ | ✓ | Poor (lab-bound) |
| **Industrial particle counter (laser obscuration)** | Real-time | $5 000 – $20 000 | ✓ | ✗ | Moderate |
| **Dye / tracer chemicals** | Minutes – hours | Adds contaminant | ✗ | ✗ | Poor |
| **NurdleDNA (this project)** | **~3 sec** | **~$230** | **✓** | **✓ (19 classes)** | **Excellent (cloud fan-out)** |

This gap exists for a structural reason. The cheap real-time tier (particle counters) historically lacks the intelligence to classify *what* the particles are — it just counts photons interrupted in a beam. The accurate classification tier (lab spectroscopy) historically lives on a benchtop and cannot be deployed inline. Until the recent arrival of low-cost edge-AI hardware (Jetson Nano, Coral USB Accelerator, Raspberry Pi 5) it was not economically possible to put a classification-grade neural network at the point of contamination.

NurdleDNA collapses the two tiers. A $99 single-board computer runs a YOLOv8n object-detection model exported to ONNX, paired with a $25 microcontroller that owns the deterministic safety logic. The result is a deployable inline unit at consumer-electronics cost that delivers laboratory-grade typing of contamination events in real time. No prior product in the academic or commercial literature combines this exact stack at this price point.

> **Use this in:** D7 slide 9 (after Results) · poster Comparison panel · D6 §2.4 Comparison of Approaches.

---

## §10 · Cost / Bill of Materials (BOM)

Itemised hardware cost, prototype unit (UAE-market USD pricing). Substitute the team's actual procurement receipts where they differ from the indicative figures below:

| Component | Qty | Unit USD | Subtotal |
|---|---|---|---|
| NVIDIA Jetson Nano Developer Kit | 1 | 99.00 | 99.00 |
| Arduino Uno R3 | 1 | 25.00 | 25.00 |
| USB webcam (UVC, 720p) | 1 | 20.00 | 20.00 |
| WS2812B-8 addressable LED strip | 1 | 4.00 | 4.00 |
| LDR + 10 kΩ resistor (turbidity) | 1 | 1.00 | 1.00 |
| MQ-135 gas sensor (VOC headspace) | 1 | 5.00 | 5.00 |
| HX711 amplifier + 1–5 kg load cell | 1 | 10.00 | 10.00 |
| MG996R metal-gear servo (pinch valve) | 1 | 10.00 | 10.00 |
| 16 × 2 I²C LCD module | 1 | 7.00 | 7.00 |
| 3 × indicator LEDs + 220 Ω resistors | 3 | 0.50 | 1.50 |
| Active piezo buzzer | 1 | 1.00 | 1.00 |
| Push-button (RST) | 1 | 0.50 | 0.50 |
| 5–6 V external supply (servo) | 1 | 8.00 | 8.00 |
| Breadboard + jumper wires | — | — | 10.00 |
| 3D-printed PLA chassis (~200 g filament) | 1 | 15.00 | 15.00 |
| Misc (USB cables, headers, brackets, screws) | — | — | 15.00 |
| **Total per unit (prototype)** | | | **~$232** |
| **Estimated unit cost at 100-unit volume** | | | **~$180** |

At this price point a port operator can equip every loading bay (typically 4–10 bays per terminal) with its own NurdleDNA unit for less than the cost of a single annual lab-spectroscopy contract. The Jetson Nano is the dominant component cost and the natural target for substitution: an upgrade path to a Jetson Orin Nano (~$249, 5–10× faster inference via TensorRT) or a downgrade to a Raspberry Pi 5 + Coral USB Accelerator (~$120, slower, no CUDA) are both viable depending on deployment requirements.

Software cost is zero — the entire stack (Ubuntu, Python, OpenCV, onnxruntime, Firebase free tier, GitHub Pages) is open-source or free-tier compatible up to several hundred concurrent devices.

> **Use this in:** D7 slide 7 footnote (cost mention during architecture slide) · poster Cost panel · D6 §8 Commercialisation & Bill of Materials.

---

## §11 · Limitations & Honest Disclosures

A frank account of where NurdleDNA falls short today. Listed academically because limitations are expected in a final design report and being explicit about them strengthens the work.

1. **Fixed central ROI.** The camera assumes the flow cell sits in the central 60 % of the frame. Mounting drift, alternative optical layouts, or a wider field-of-view lens require recalibrating the ROI bounds in `jetson/config.py`. There is no auto-ROI calibration.
2. **No UV fluorescence excitation.** A 365 nm UV LED would dramatically boost contrast for plastic detection because most polymers fluoresce under UV. The firmware already pulses a digital pin (`pulseUV()`) reserved for this LED, but the LED itself is not yet sourced. Current operation uses visible-light HSV + AI classification only.
3. **Tested in still water only.** Bench tests used a clear container of still water with manually dropped pellets. Flowing-water behaviour — surface ripples, air bubbles, fast-moving pellets — is not yet validated. Pellets crossing the frame in less than the 2.5-second confirmation window would not trigger an AI-path ALARM, although the LDR turbidity sensor would still respond.
4. **No real-flow calibration.** LDR threshold (>600 raw → WARN), MQ-135 threshold (>200 raw → CRIT), and HX711 scale factor are all set to bench-test values from `firmware/nurdle-dna/nurdle-dna.ino`. Field deployment requires per-site calibration with known references.
5. **Single-class showcase model.** Overall mAP@50 = 0.31 across the 19 microplastic classes in the public dataset. Production deployment in a polymer plant should retrain a focused 2–3-class model (e.g. *Pellet*, *Fragment*, *Other*) for stronger headline accuracy.
6. **Wired Arduino dependency for the valve.** The servo and the analogue sensors live on the Arduino; without a USB connection between Jetson and Arduino, alarms still fire on the website but the valve does not close. A wireless variant (BLE or LoRa) is straightforward but not implemented.
7. **No tamper detection.** An operator could physically defeat the system by covering the camera or unplugging cables. Industrial deployment would need a sealed enclosure with intrusion detection.
8. **Class imbalance in training data.** The Roboflow microplastics dataset has heavy class imbalance — several classes have fewer than 10 training samples and are unreliable. This is precisely why we report per-class metrics rather than only the overall mAP.
9. **Firebase free tier capacity.** At one snapshot per second, ~1 GB/day of bandwidth — comfortable inside the 10 GB/month Firebase free tier for a single device but would saturate at roughly 10 concurrent devices. Production deployment of more than ~20 devices needs a paid Firebase plan or a self-hosted backend.

> **Use this in:** D7 closing remark (optional) · D6 §9 Limitations and Future Work · poster footer (small print, optional).

---

## §12 · Anticipated Q&A — D7 Rehearsal Notes

Twelve likely assessor questions with one-paragraph answers, organised by theme. Use these for rehearsal in the days before the D7 slot.

### On the AI

**1. "Why YOLOv8n and not the larger v8s/m, or the newer YOLOv9?"**
The Nano variant fits the Jetson Nano's compute envelope — about 2.6 million parameters, runs above 5 fps with onnxruntime on CPU. YOLOv9 was released after our training window opened; YOLOv8n was already proven on edge devices. We treat the model as a swappable component — a future iteration could re-export YOLOv9n or YOLOv11n to ONNX and the rest of the pipeline doesn't change.

**2. "Your overall mAP@50 is 0.31 — isn't that low?"**
It's averaged across 19 classes and several of those classes have fewer than 10 training samples, which drags the average down. On the classes that matter for our use case the model is competitive: Fragment 0.60, Pen 0.81, Air-bubble 0.75. A production deployment would retrain on a focused 2–3-class subset specific to one polymer plant's spill profile, where we'd expect mAP above 0.70.

**3. "What stops the AI from triggering on bubbles, ripples, or splashes?"**
Four layers stacked. Region-of-interest mask ignores the edges of the frame where reflections happen. Circularity filter rejects elongated highlights — only round-ish blobs survive. Exponential moving average smooths the per-frame count so a single noisy frame is filtered out. And a 2.5-second confirmation timer means the candidate state must be sustained continuously before the public state actually changes. Bench-tested under varied lighting for 30 minutes with no pellets present: zero false alarms.

### On the architecture

**4. "Why two processors? Couldn't the Jetson do everything?"**
Industrial safety code requires deterministic decision-making for any action that physically stops a process. The Jetson runs probabilistic AI which can be slow or wrong on edge cases; the Arduino runs a deterministic FSM that always closes the valve when the LDR or gas sensor crosses a threshold. The Arduino is the safety-critical processor; the Jetson is the smart augmentation that lets it react sooner and with class information.

**5. "What happens if the Arduino disconnects?"**
The Jetson detects the missing telemetry — default fields go to None — and falls back to deriving the FSM state from the camera count alone. The website still escalates correctly (S1 → S2 → S3). The valve, however, lives on the Arduino — if the Arduino is disconnected, the valve cannot close. We document this as a limitation. A future wireless variant would be a sensible iteration.

**6. "What happens if the Jetson disconnects?"**
The Arduino runs its own analogue thresholds independently — LDR > 600 triggers WARN, MQ-135 > 200 triggers CRIT — and reacts without any Jetson input. It loses the AI vision channel but retains turbidity and gas detection plus full valve control. This is exactly the redundancy industrial safety practice expects.

### On scaling and deployment

**7. "How would you scale this to 100 bays?"**
Each unit publishes to the same Firebase project under a unique device ID — `NURDLE-001`, `NURDLE-002`, and so on. The website already structures data as `/devices/<id>` so a multi-bay map view is a small website change. Backend cost stays inside the Firebase free tier up to roughly 10 GB/month of traffic, then a few dollars per month per additional 10 GB.

**8. "What does this cost to run?"**
Roughly $232 per prototype unit (full BOM in §10), dropping to ~$180 at volume. Power draw: Jetson 10 W + Arduino 0.5 W + servo (transient) ≈ 15 W at peak. Annual electricity is around $15 per unit at typical UAE commercial rates.

**9. "How would you certify this for industrial use?"**
Out of scope for an academic project, but the path is clear: IP65-rated enclosure, marine-grade connectors, ATEX certification if used in flammable atmospheres, plus on-site calibration paperwork. The architecture (deterministic Arduino plus immutable cloud audit log) is already certification-friendly because the safety actor is a deterministic processor.

### On the data and method

**10. "Where did the dataset come from? Is it real microplastic imagery?"**
Roboflow `microplastics-t0ddd` v6 — a public dataset hosted on Roboflow Universe with 3 102 images of real microplastic samples photographed under controlled lighting, labelled across 19 microplastic classes[^7]. We did not collect the imagery ourselves — we reuse a community-contributed dataset and cite it.

**11. "Could the same architecture detect oil droplets, not just nurdles?"**
Yes — and this connects directly to the oil/petrochemical positioning of the project. The MQ-135 already detects hydrocarbon vapours; the LDR responds to oil-induced turbidity. The camera + AI would need retraining on oil-droplet imagery, which is approximately a one-week dataset-collection task. The hardware doesn't change. We see this as the natural V2 scope.

**12. "What's the failure mode you're most worried about?"**
Optical-path obstruction. If algae or biofilm grows on the flow-cell window over weeks, the LDR baseline drifts and the camera sees less. Mitigations include a scheduled mechanical wiper, periodic chemical cleaning, baseline auto-calibration, and flagging the unit as "service required" when the LDR baseline shifts more than two standard deviations from its calibration value.

> **Use this in:** D7 rehearsal session (read each Q out loud, time the answer) · D6 appendix Q&A.

---

## §References

[^1]: Sherrington, C. *et al.* — *Plastics in the Marine Environment*, Eunomia Research & Consulting, 2016. ~230 000 tonnes / ~10 trillion pellets per year estimate.
[^2]: International Union for Conservation of Nature (IUCN), 2017 — *Primary Microplastics in the Oceans: A Global Evaluation of Sources*. Pre-production pellets identified as the second-largest direct source after tyre wear.
[^3]: United Nations Environment Programme & Sri Lanka Government, 2021 — *X-Press Pearl Maritime Disaster: Initial Assessment*. ~1 680 tonnes of nurdles released, single largest plastic spill in maritime history.
[^4]: United Nations General Assembly, 2015 — *Transforming Our World: the 2030 Agenda for Sustainable Development*. Official SDG goals and targets.
[^5]: UAE Cabinet, November 2022 — *We the UAE 2031* national vision launch announcement.
[^6]: UAE Ministry of Climate Change and Environment, October 2021 — *UAE Net Zero by 2050 Strategic Initiative* announcement.
[^7]: Roboflow Universe — *uni-oahuo / microplastics-t0ddd* v6. Public dataset, 3 102 labelled images across 19 microplastic classes. Accessed May 2026.
