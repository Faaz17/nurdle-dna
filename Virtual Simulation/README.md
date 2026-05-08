# Virtual Simulation

The 3D virtual simulation is built from scratch and embedded directly in the Nurdle DNA website. It has three interactive layers:

| Layer | What it shows |
|-------|--------------|
| **Device Viewer** | 3D model of the nurdle detection hardware (loaded from Fusion 360 export) |
| **Environmental Animation** | Particle system showing nurdle microplastics moving through water |
| **Sensor Dashboard** | Real-time / recorded sensor readings as a 3D heatmap and charts |

---

## Tech Stack

- **React Three Fiber** (`@react-three/fiber`) — React wrapper for Three.js
- **`@react-three/drei`** — helpers: `useGLTF`, `OrbitControls`, `Environment`
- **Three.js** — underlying 3D engine
- Source CAD files: Autodesk Fusion 360 (`.f3d`) in `../Fusion Files/`

---

## Folder Structure

```
Virtual Simulation/
├── models/       ← glTF exports from Fusion 360 go here (.glb files)
└── README.md     ← this file
```

---

## Exporting from Fusion 360

1. Open your design in **Autodesk Fusion 360**
2. Go to **File > Export**
3. Set format to **glTF 2.0**
4. Save the `.glb` file into `Virtual Simulation/models/`
5. Use this naming convention:
   - `device-main.glb` — full assembled device
   - `device-exploded.glb` — exploded view (if needed)

---

## Loading the Model in React Three Fiber

```tsx
import { useGLTF } from '@react-three/drei'

useGLTF.preload('/models/device-main.glb')

function DeviceModel() {
  const { scene } = useGLTF('/models/device-main.glb')
  return <primitive object={scene} />
}
```

Wrap the scene in a `Canvas` + `Suspense`:

```tsx
<Canvas>
  <Suspense fallback={<Loader />}>
    <ambientLight intensity={0.5} />
    <directionalLight position={[10, 10, 5]} />
    <DeviceModel />
    <OrbitControls />
  </Suspense>
</Canvas>
```

---

## Status

- [ ] Fusion 360 model exported to `models/`
- [ ] Device viewer component built
- [ ] Particle animation (environmental nurdle movement) built
- [ ] Sensor data dashboard connected
- [ ] Simulation embedded in the website
