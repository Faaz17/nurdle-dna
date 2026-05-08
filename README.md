# NurdleDNA

**ECTE 250 — Team 2 (Arc Tech) — University of Wollongong**

An inline IoT water monitoring unit that detects nurdle microplastics and industrial contaminants, automatically isolates flow, captures physical evidence, and logs audit-grade data to a cloud dashboard.

---

## Team

| Name | Student ID | Role |
|------|-----------|------|
| Muhammad Haaziq | 8927133 | System Architect, 3D Model, Project Lead |
| Faaz Ali Sayyed | 8943564 | Circuit Design (TinkerCAD), State Machine |
| Daniel Koshy | 8938799 | Circuit Simulation (Multisim), Finance/WBS |
| Mohammed Abdul Rahman | 9070734 | Marketing, Meeting Management |

---

## How It Works — Detect → Classify → Actuate → Capture → Report

```
Water inlet
  → Mixing section (anti-settling)
  → Optical flow cell (camera + UV LED)   ← Jetson Nano AI vision
  → Servo pinch valve                      ← Arduino FSM control
  → Evidence cartridge + load cell
  → Outlet / waste

Headspace → MQ gas sensor                 ← VOC / gas leak detection
```

All events are time-stamped and uploaded to a Firebase cloud dashboard accessible via the website.

---

## System Architecture

**Dual-processor design:**

| Processor | Role |
|-----------|------|
| NVIDIA Jetson Nano | AI vision (nurdle detection), cloud/IoT transmission |
| Arduino Uno/Nano | Reads sensors, controls servo valve, runs FSM outputs |
| Communication | USB Serial (JSON messages between both processors) |

**5-State Moore FSM:**

| State | Name | Valve | Status |
|-------|------|-------|--------|
| S0 | INIT | Open | Power-up self-test |
| S1 | SysOk | Open | Normal — green LED |
| S2 | Causn | Open | Warning — yellow LED |
| S3 | ALRM | **Closed** | Alarm latched — red LED + buzzer |
| S4 | RSTIN | Open | Reset (operator button required) |

---

## Hardware Components

| Component | Part | Purpose |
|-----------|------|---------|
| AI processor | NVIDIA Jetson Nano | Camera inference, cloud logging |
| Microcontroller | Arduino Uno/Nano | Sensors + actuators + FSM |
| Camera | CSI/USB camera | AI nurdle detection |
| UV LED ring | 365 nm LED | Fluorescence for source classification |
| Gas sensor | MQ-135 / MQ-4 | VOC / gas leak in headspace |
| Load cell | 1–5 kg + HX711 | Measures mass of captured particles |
| Servo valve | MG996R | Pinch valve — closes on ALARM |
| Pump | Peristaltic DC pump | Continuous closed-loop water flow |
| Display | I2C 16×2 LCD | Local status display |
| Indicators | RGB LEDs + buzzer | Visual and audio alerts |

---

## Project Structure

```
Nurdle DNA/
├── Website/                  # React / Next.js web application + dashboard
├── Virtual Simulation/       # 3D simulation (React Three Fiber)
│   └── models/               # glTF exports ready for Three.js (.glb)
├── Fusion Files/             # Autodesk Fusion 360 source files + glTF exports
├── Posters/                  # Project posters and visual materials
├── Deliverable Reports/      # Academic reports (PDFs)
├── Team Information/         # Team bios, roles, contact info
└── .claude/                  # Claude Code AI workspace configuration
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Website | React / Next.js (App Router, TypeScript) |
| 3D Simulation | React Three Fiber + `@react-three/drei` |
| CAD Source | Autodesk Fusion 360 (`.f3d`) |
| 3D Web Model | `Nurdle_DNA_Colored.glb` (in `Virtual Simulation/models/`) |
| Cloud Database | Firebase Realtime Database |
| Embedded AI | NVIDIA Jetson Nano — YOLOv8n / OpenCV |
| Microcontroller | Arduino Uno/Nano |
| Styling | Tailwind CSS (planned) |

---

## Cloud IoT Data Packet

Each event logged to Firebase:

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
  "fsm_state": "S3",
  "valve": "CLOSED"
}
```

---

## Website Dashboard (Planned)

1. **Live Monitor** — real-time Density Index, FSM state badge, valve status
2. **Event Log** — all alarm events with timestamp, bay, grams captured, DNA source
3. **Bay Map** — multi-site bay selector; highlights bays in ALARM
4. **Device Health** — uptime, last communication

---

## Using the 3D Model

The Fusion 360 model has been exported as glTF and is ready for the web:

- Source files: `Fusion Files/Nurdle_DNA_Colored.gltf` / `.glb`
- Web app path: `Virtual Simulation/models/Nurdle_DNA_Colored.glb`

To load in React Three Fiber:
```tsx
import { useGLTF } from '@react-three/drei'

useGLTF.preload('/models/Nurdle_DNA_Colored.glb')

function DeviceModel() {
  const { scene } = useGLTF('/models/Nurdle_DNA_Colored.glb')
  return <primitive object={scene} />
}
```

---

## Getting Started (Website)

> Full setup instructions will be added once the website codebase is integrated.

```bash
cd Website
npm install
npm run dev   # http://localhost:3000
```

---

## Contribution Workflow

1. Create a branch: `git checkout -b feature/your-feature-name`
2. Make your changes and verify (screenshot or test output)
3. Commit: `git commit -m "feat: describe your change"`
4. Push and open a Pull Request — requires 1 team member review before merge

Branch naming: `feature/`, `fix/`, `chore/`, `docs/`

---

## Deliverables

| # | Deliverable | Status |
|---|------------|--------|
| D1 | Concept Report | ✅ Complete |
| D2 | Detailed Design Report | ✅ Complete |
| D3 | Design Simulation (Multisim + TinkerCAD) | ✅ Complete |
| D4 | TinkerCAD Prototype | ⏳ Upcoming |
| D5 | Breadboard Prototype | ⏳ Upcoming |
| D6 | Final Design Report | ⏳ Upcoming |
| D7 | Final Presentation | ⏳ Upcoming |
| D8 | Innovation Fair | ⏳ Upcoming |

---

*ECTE 250 — University of Wollongong*
