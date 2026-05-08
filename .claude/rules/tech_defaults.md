# Tech Defaults

## Next.js (App Router)

- Use the **App Router** (`app/` directory) — not Pages Router
- **TypeScript** everywhere — no plain `.js` files in the website
- Default to **Server Components**; add `"use client"` only when you need browser APIs, event handlers, or React state
- Keep data fetching in Server Components or Route Handlers (`app/api/`)
- Use `next/image` for all images (automatic optimisation)
- Use `next/link` for all internal navigation (prefetching)

---

## React Conventions

- One component per file; filename matches the component name (PascalCase)
- Keep components small and focused — split when a component does more than one thing
- Lift state only as high as needed — avoid prop-drilling more than 2 levels (use context or a state library instead)
- No inline styles; use CSS modules or Tailwind utility classes

---

## React Three Fiber (3D Simulation)

- Use **React Three Fiber** (`@react-three/fiber`) as the React wrapper for Three.js — not raw Three.js inside React
- Use **`@react-three/drei`** for common helpers: `OrbitControls`, `useGLTF`, `Environment`, `Text`, `Html`
- Load glTF models with `useGLTF('/models/filename.glb')` — preload at the top of the file with `useGLTF.preload()`
- Wrap the Canvas in a `Suspense` boundary with a fallback loader
- For nurdle particle animation: use `InstancedMesh` — never render hundreds of individual mesh components
- Dispose of geometries and materials on unmount to avoid memory leaks

```tsx
// Minimal scene structure
<Canvas>
  <Suspense fallback={<Loader />}>
    <ambientLight intensity={0.5} />
    <directionalLight position={[10, 10, 5]} />
    <DeviceModel />
    <NurdleParticles />
    <OrbitControls />
  </Suspense>
</Canvas>
```

---

## Fusion 360 → Web Pipeline

| Step | Tool | Output |
|------|------|--------|
| Design | Autodesk Fusion 360 | `.f3d` |
| Export | File > Export > glTF 2.0 | `.glb` or `.gltf` + textures |
| Optimise (optional) | gltf-transform or Blender | smaller `.glb` |
| Load | `useGLTF` from `@react-three/drei` | Three.js scene graph |

---

## Clean Code

- **Naming**: descriptive names; no abbreviations unless universally understood (`url`, `id`, `api`)
- **Functions**: do one thing; ≤ 20 lines is a good target
- **No magic numbers**: extract constants with meaningful names
- **Imports**: group — (1) React/framework, (2) third-party, (3) local — separated by blank lines
- **No dead code**: remove unused imports, variables, and commented-out blocks before committing

---

## 3D Simulation (placeholder — update when simulation stack is finalised)

> This section will be expanded once the full simulation architecture is decided.  
> Current plan: React Three Fiber + particle system for environmental animation + sensor data as 3D heatmap.
