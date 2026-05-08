# NurdleDNA — Claude Code Project Brain

## Project Overview

**NurdleDNA** — ECTE 250, Team 2 (Arc Tech)  
**Team:** Muhammad Haaziq (8927133), Faaz Ali Sayyed (8943564), Daniel Koshy (8938799), Mohammed Abdul Rahman (9070734)  
**Context:** UAE — industrial ports, polymer plants, pellet handling facilities  
**Theme:** Industry 4.0, Humanitarian Engineering, Environment

An inline IoT water monitoring unit that detects nurdle microplastics and industrial contaminants, automatically isolates flow, captures physical evidence, and logs audit-grade data to the cloud.

---

## Core Architecture: Detect → Classify → Actuate → Capture → Report

```
Water inlet
  → Mixing section (anti-settling)
  → Optical flow cell (camera + UV LED + LDR)
  → Servo pinch valve (controlled by Arduino)
  → Evidence cartridge + load cell (HX711)
  → Outlet / waste
  
Headspace → MQ gas sensor
```

---

## Dual-Processor Design

| Processor | Role |
|-----------|------|
| **NVIDIA Jetson Nano** | AI vision (YOLOv8n / OpenCV), dashboard, cloud IoT transmission |
| **Arduino Uno/Nano** | Reads analog sensors, controls servo valve, runs FSM outputs, drives LCD/LEDs/buzzer |
| **Communication** | USB Serial — JSON messages (see Serial Protocol below) |

---

## Serial Communication Protocol (Jetson ↔ Arduino)

**Jetson → Arduino** (commands):
```json
{"state": "WARN|CRIT|CLEAR", "confidence": 0.85, "count": 12}
```

**Arduino → Jetson** (telemetry, every 200ms):
```json
{"fsm_state": "S1|S2|S3|S4", "valve": "OPEN|CLOSED",
 "ldr": 542, "gas": 380, "load_g": 3.4}
```

This protocol must be agreed and frozen before breadboard integration (Deliverable 5).

---

## 5-State Moore FSM

| State | Name | Valve | LEDs | Buzzer | Trigger |
|-------|------|-------|------|--------|---------|
| S0 | INIT | OPEN | All ON | OFF | Power-up |
| S1 | SysOk | OPEN | Green | OFF | No hazard |
| S2 | Causn | OPEN | Yellow | OFF | WARN input |
| S3 | ALRM | CLOSED | Red | ON | CRIT input (latched) |
| S4 | RSTIN | OPEN | All ON | OFF | RST button |

FSM inputs: `WARN` (low contamination), `CRIT` (high contamination OR gas leak), `RST` (operator button)  
FSM is latched in S3 — can only exit via operator RST button.

---

## Sensors & Actuators

| Component | Part | Purpose |
|-----------|------|---------|
| Camera | Jetson Nano CSI/USB | AI nurdle detection (YOLOv8n) |
| UV LED ring | 365nm LED | Fluorescence excitation for forensic classification |
| LDR | Analog to Arduino A0 | Turbidity proxy (TinkerCAD simulation) |
| Gas sensor | MQ-135 or MQ-4 | VOC / gas leak detection in headspace |
| Load cell | 1–5kg + HX711 | Measures mass of captured particles |
| Servo valve | MG996R | Pinch valve — closes on ALARM |
| Peristaltic pump | DC pump | Continuous closed-loop water flow |
| LCD/OLED | I2C 16×2 | Local status display |
| RGB LEDs + Buzzer | GPIO | Visual and audio alerts |

---

## Current Arduino Code Status (as of D3)

The submitted code has:
- ✅ Basic 3-sensor FSM logic (LDR, gas, chemical/potentiometer)
- ✅ Servo valve control
- ✅ LCD feedback
- ✅ Latched alarm + reset button
- ❌ HX711 load cell reading (not implemented)
- ❌ Serial communication with Jetson Nano (not implemented)
- ❌ Firebase / IoT cloud transmission (not implemented)
- ❌ UV LED control (not implemented)
- ❌ Debounce / confidence window (single spike triggers alarm)

---

## IoT Data Packet (Firebase Schema)

```json
{
  "timestamp": "2026-05-08T14:32:00Z",
  "device_id": "NURDLE-001",
  "bay_id": "BAY-1",
  "density_index": 72,
  "status": "ALARM",
  "grams_captured": 3.4,
  "dna_source": "SOURCE-B",
  "gas_ppm": 120,
  "temperature": 24.5,
  "fsm_state": "S3",
  "valve": "CLOSED"
}
```

**Cloud platform:** Firebase Realtime Database  
**Transmission:** Jetson Nano → Firebase via `pyrebase4` or REST API  
**Website:** Next.js subscribes via Firebase SDK

---

## Website Dashboard Pages

1. **Live Monitor** — Density Index gauge, FSM state badge (green/yellow/red), live sensor readings, valve status
2. **Event Log** — table of all alarm events; CSV export
3. **Bay Map** — multi-site bay selector; highlights which bay is in ALARM
4. **Device Health** — uptime, last communication timestamp

---

## 3D Virtual Simulation (React Three Fiber)

Mirrors the real device behaviour — driven by Firebase live data:

| Layer | Shows | Source |
|-------|-------|--------|
| Device viewer | Fusion 360 glTF model; hover each component for label | Static glTF |
| Flow animation | Particle system: nurdles flowing through tube → chamber → cartridge | Animated (Three.js) |
| FSM state | Colour ring: green/yellow/red; valve mesh pinches shut on ALARM | Firebase realtime |
| Dashboard overlay | Density Index, grams captured, event log | Firebase realtime |

**Fusion 360 export:** File > Export > glTF 2.0 → `Virtual Simulation/models/device-main.glb`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Website | Next.js (App Router), TypeScript |
| 3D Simulation | React Three Fiber + @react-three/drei |
| Cloud DB | Firebase Realtime Database |
| Embedded AI | NVIDIA Jetson Nano — YOLOv8n (ONNX) or OpenCV |
| Microcontroller | Arduino Uno/Nano |
| Styling | TBD (Tailwind CSS recommended) |

---

## Mandatory Development Loop

```
1. TASK    → Define what you're building and why
2. BUILD   → Implement the change
3. VERIFY  → Confirm it works (screenshot or test output — no exceptions)
```

---

## Deliverables Remaining

| # | Deliverable | Key items |
|---|------------|-----------|
| D4 | TinkerCAD Prototype | Full FSM demo with all I/O |
| D5 | Breadboard Prototype | HX711, serial protocol, calibrated thresholds, debounce |
| D6 | Final Design Report | Calibration table, accuracy metrics, response time, AI model spec |
| D7 | Final Presentation | Block diagram, FSM, demo results, key decisions |
| D8 | Innovation Fair | Rehearsed 3-min demo, poster, live device |

---

## Folder Map

```
Nurdle DNA/
├── Website/              ← Next.js app (friend's code, pending)
├── Virtual Simulation/
│   ├── models/           ← glTF exports from Fusion 360 (.glb)
│   └── README.md
├── Fusion Files/         ← Autodesk Fusion 360 .f3d source files
├── Deliverable Reports/  ← Deliverable 2 + 3 PDFs
├── Posters/
├── Team Information/
└── .claude/              ← Claude Code workspace
```
