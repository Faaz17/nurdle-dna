# Design Rules

## Core Principles

1. **Responsive first** — every layout works on mobile, tablet, and desktop
2. **Accessible** — meet WCAG 2.1 AA minimum (keyboard nav, screen reader labels, colour contrast ≥ 4.5:1)
3. **Dark-mode-ready** — the science/data aesthetic suits a dark theme; implement `prefers-color-scheme` support
4. **Data clarity** — visualisations must communicate clearly at a glance; no decorative complexity

---

## Visual Style

- **Aesthetic**: Clean, scientific, modern — think environmental monitoring dashboard
- **Colour palette**: Dark background preferred; accent with teal/cyan (water reference) or clean blues
- **Typography**: Legible sans-serif; hierarchy through weight and size, not decoration
- **Spacing**: Use a consistent 4px or 8px base grid — no arbitrary pixel values
- **Iconography**: Minimal; use only where meaning is unambiguous

---

## 3D Simulation Design

- The Three.js / React Three Fiber scene must match the website colour palette
- Camera controls: always provide `OrbitControls` so users can explore the 3D model freely
- Loading state: show a spinner or progress bar while the glTF model loads
- Performance: target 60fps on mid-range hardware; use `InstancedMesh` for particle effects (nurdle animation)
- Lighting: use `ambientLight` + `directionalLight` as a baseline; avoid over-lit scenes

---

## Dashboard

- Sensor data charts must have labelled axes and units
- Heatmaps must include a legend with min/max values
- Show loading/error states for all data fetches
- Use progressive disclosure — summary first, detail on expand/click

---

## Accessibility Checklist

- [ ] All interactive elements reachable by keyboard (`Tab` order logical)
- [ ] All images have `alt` text; decorative images have `alt=""`
- [ ] Three.js canvas has an accessible description (`aria-label`)
- [ ] Colour is never the only indicator of meaning
- [ ] Focus indicators are visible
