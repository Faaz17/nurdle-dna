# Nurdle DNA — Claude Code Project Brain

## Project Overview

**Nurdle DNA** is a microplastic detection and analysis system built for ECTE 250, Team 2.  
Nurdles are pre-production plastic pellets; this system detects their presence using a hardware sensor device and presents the data through an interactive web platform with 3D visualisation.

---

## Workstreams

| Workstream | Location | Status |
|-----------|---------|--------|
| Website (React/Next.js) | `Website/` | Friend's code to be merged |
| 3D Virtual Simulation | `Virtual Simulation/` | To be built |
| CAD Source Files | `Fusion Files/` | Fusion 360 .f3d files |
| Deliverable Reports | `Deliverable Reports/` | PDFs (complete) |
| Posters | `Posters/` | To be added |
| Team Info | `Team Information/` | To be added |

---

## Tech Stack

- **Website**: Next.js (App Router), TypeScript, React
- **3D Simulation**: React Three Fiber (`@react-three/fiber`) + Three.js + `@react-three/drei`
- **CAD Pipeline**: Autodesk Fusion 360 → export as glTF 2.0 → load via `useGLTF` hook
- **Styling**: TBD (Tailwind CSS recommended)
- **Testing**: Vitest (unit), Playwright (E2E)

---

## Three Simulation Layers

1. **Device 3D Viewer** — interactive rotate/zoom of the detection hardware (glTF from Fusion 360)
2. **Environmental Animation** — particle system simulating nurdle movement in water
3. **Sensor Data Dashboard** — 3D heatmap / charts from real-time or recorded sensor data

---

## Mandatory Development Loop

**Every task must follow this loop — no exceptions:**

```
1. TASK    → Define what you're building and why
2. BUILD   → Implement the change
3. VERIFY  → Confirm it works (screenshot the UI or run automated tests)
```

Never mark a task complete without verification evidence.

---

## Key Workflows

### Exporting from Fusion 360
1. Open design in Autodesk Fusion 360
2. File > Export > Format: **glTF 2.0**
3. Save to `Virtual Simulation/models/`
4. Load in React Three Fiber: `const { scene } = useGLTF('/models/device.glb')`

### Running the Website (fill in when code arrives)
```bash
cd Website
npm install
npm run dev   # http://localhost:3000
```

### Adding a New Feature
```bash
git checkout -b feature/your-feature-name
# ... build and verify ...
git add <specific files>
git commit -m "feat: describe the change"
# open PR on GitHub
```

---

## Rules

All development must follow the rules in `.claude/rules/`:
- `workflow.md` — TDD loop, branch strategy, planning requirements
- `design_rules.md` — UI/UX standards (responsive, accessible, dark-mode-ready)
- `tech_defaults.md` — Next.js, TypeScript, React Three Fiber conventions

---

## Agents Available

- `agents/researcher.md` — web research, docs lookup, microplastics data
- `agents/code_reviewer.md` — static code analysis, 3D performance review
- `agents/qa.md` — test generation for components and E2E flows
