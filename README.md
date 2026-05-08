# Nurdle DNA

**ECTE 250 — Team 2**

A microplastic detection and analysis system. Nurdles are pre-production plastic pellets; this project detects, analyses, and visualises their presence in the environment through a hardware sensor device and an interactive web platform.

---

## Project Structure

```
Nurdle DNA/
├── Website/                  # React / Next.js web application
├── Virtual Simulation/       # 3D simulation assets and scene code
│   └── models/               # glTF / OBJ exports from Fusion 360
├── Fusion Files/             # Autodesk Fusion 360 source CAD files (.f3d)
├── Posters/                  # Project posters and visual materials
├── Deliverable Reports/      # Academic reports (PDFs)
├── Team Information/         # Team bios, roles, contact info
└── .claude/                  # Claude Code workspace configuration
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Website | React / Next.js (App Router, TypeScript) |
| 3D Simulation | React Three Fiber + Three.js |
| CAD Source | Autodesk Fusion 360 (.f3d) |
| 3D Export Pipeline | Fusion 360 → glTF 2.0 → Three.js |
| Styling | TBD (Tailwind CSS recommended) |
| Testing | Vitest (unit) + Playwright (E2E) |

---

## Three Simulation Layers

1. **Device 3D Viewer** — Interactive model of the detection hardware (loaded from Fusion 360 export)
2. **Environmental Animation** — Particle system showing nurdle movement through water
3. **Sensor Data Dashboard** — Real-time / recorded sensor readings as 3D heatmap and charts

---

## Getting Started

> Website setup instructions will be added once the codebase is integrated.

```bash
# Coming soon — fill in when Next.js app is scaffolded
cd Website
npm install
npm run dev
```

---

## Exporting 3D Models from Fusion 360

1. Open your design in Autodesk Fusion 360
2. File > Export
3. Format: **glTF 2.0** (preferred) or OBJ
4. Save to `Virtual Simulation/models/`
5. The Next.js app loads the model via `@react-three/drei`'s `useGLTF` hook

---

## Contribution Workflow

1. Create a branch: `git checkout -b feature/your-feature-name`
2. Make your changes and verify them (screenshot or automated test)
3. Commit: `git commit -m "feat: describe your change"`
4. Push and open a Pull Request on GitHub
5. Get at least one team member review before merging

Branch naming: `feature/`, `fix/`, `chore/`, `docs/`

---

## Team

| Name | Role |
|------|------|
| _(add names)_ | _(add roles)_ |

---

*ECTE 250 — University of Wollongong*
