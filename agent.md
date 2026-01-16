# Agent Instructions: Schwarzschild Geodesic Simulator

You are a senior frontend engineer and physicist tasked with building a high-fidelity, interactive 3D simulation of null geodesics (light rays) in Schwarzschild spacetime. 

## 1. Project Goal
Create a React-based web application that visualizes how light bends around a black hole. The app must solve the geodesic equations of General Relativity in real-time and render the results using WebGL (Three.js).

## 2. Tech Stack & Environment
- **Framework:** React 18 (with Hooks).
- **Language:** TypeScript (Strict mode).
- **3D Engine:** Three.js (Raw API managed via React `useRef`, not React-Three-Fiber, for maximum performance control).
- **Styling:** Tailwind CSS (Custom "Space" color palette).
- **Icons:** Lucide React.
- **Build Tool:** Vite.

## 3. Scientific Formulations (Physics Engine)
The core logic resides in `services/physics.ts`. You must implement a numerical integrator for the Schwarzschild metric.

### Constants & Units
- Use Geometrized Units where $G = c = 1$.
- **Mass ($M$):** Variable, controlled by user (Range: 0.5 to 2.5).
- **Schwarzschild Radius ($R_s$):** $2M$ (Event Horizon).
- **Photon Sphere ($R_{ph}$):** $3M$ (Unstable circular orbit).
- **Critical Impact Parameter ($b_{crit}$):** $3\sqrt{3}M \approx 5.196M$.

### Equations of Motion
We simulate **Null Geodesics** (light). The trajectory is calculated in a 2D polar plane $(r, \phi)$ first, then rotated into 3D.

The Effective Potential $V_{eff}$ for a photon with impact parameter $b$ is:
$$ \frac{1}{b^2} = \frac{1}{r^4} \left(\frac{dr}{d\lambda}\right)^2 + V_{eff}(r) $$
$$ V_{eff}(r) = \frac{1}{r^2}\left(1 - \frac{2M}{r}\right) $$

Let $F = 1 - \frac{b^2}{r^2}(1 - \frac{2M}{r})$.
- If $F < 0$, the photon hits a turning point (periapsis) and scatters back.
- If $F > 0$ and $dr < 0$ continuously, the photon crosses the horizon.

### Integration Strategy
1.  **Step Size ($d\lambda$):** 0.05 (adjustable).
2.  **Termination Conditions:**
    -   $r < 2.01M$ (Capture/Trapped).
    -   $r > 150$ (Escape).
    -   Max steps reached (default 6000).
3.  **Coordinate Transformation:**
    -   Calculate trajectory in local 2D plane ($x = r\cos\phi, y=r\sin\phi$).
    -   Apply Euler rotations (Matrix math) based on emission distribution (Isotropic vs. Planar) to position the ray in 3D space.

## 4. Architecture & Data Structures

### `types.ts`
Define the core structures:
```typescript
interface Point3D {
  r: number; phi: number;
  x: number; y: number; z: number;
  crossed: boolean; escaped: boolean; turned: boolean;
}

interface RayPath {
  id: string;
  b: number; // Impact parameter
  color: string;
  points: Point3D[];
  // ... status flags
}
```

### `services/physics.ts`
- **`computeTrajectory(b, mass)`**: Runs the numerical integration loop.
- **`buildRays(...)`**: Generates a set of rays based on distribution modes:
    -   *Isotropic*: Random sphere distribution.
    -   *Planar*: Equatorial plane only.
    -   *Beam*: Focused parallel rays.

### `components/SimulationCanvas.tsx`
This is the Three.js renderer.
- **Scene Setup**: Dark space background, high-density starfield.
- **Optimization**: **MUST** use shared `BufferGeometry` and `Materials` for ray objects to support up to **1000 rays** without dropping frames.
- **Structural Components**:
    -   **Event Horizon**: Sphere at $2M$. When "Hidden", it should be completely removed from the scene (set `visible = false`), allowing background stars to be seen through it.
    -   **Photon Sphere**: Wireframe at $3M$.
    -   **Accretion Disk**: Custom ShaderMaterial with procedural noise.
- **Ray Rendering**:
    -   **Trails**: Use `Line` with `vertexColors` enabled.
    -   **Photon Head**: Shared low-poly `SphereGeometry`.

### `components/Controls.tsx`
A glassmorphism UI panel using Tailwind.
- **Inputs**: Sliders for Mass, Impact Parameter ($b$), Ray Count (up to 1000), Speed.
- **Modes**: Toggle between Distribution Modes (Beam/Random/Plane).
- **Visuals**: Toggle for "Event Horizon" visibility.
- **Playback**: Play/Pause/Reset/Seek functionality.

## 5. Visual Behavior & Coloring Logic

### Coloring Rules (Gravitational Redshift)
Photons change color dynamically based on radial coordinate $r$:
1.  **Far Field ($r > 10M$)**: Blueish White (High energy).
2.  **Mid Field ($r \approx 4M$)**: Gold/Yellow.
3.  **Near Field ($r < 2.2M$)**: Deep Red (Redshifted).
4.  **Horizon**: Fade to dark/black.

### Visibility Logic
- **"Structural Vis: OFF"**: Hides the Photon Sphere wireframe, Accretion Disk, Glow, and Event Horizon mesh. Only the photon rays and the starfield remain visible.

### Aesthetic Guidelines
- **Theme**: "Space" (Deep blues/blacks).
- **UI**: Translucent backgrounds (`bg-space-700/50`), thin borders (`border-white/10`), mono-spaced fonts for data.
- **Three.js Optimization**: Use `BufferGeometry` for lines. Update `drawRange` for animation instead of rebuilding geometry every frame.

## 6. Implementation Steps

1.  **Scaffold**: Set up the React + Vite + Tailwind structure.
2.  **Physics Core**: Implement the Schwarzschild integration logic in `physics.ts`. Verify energy conservation.
3.  **3D Setup**: Create the `SimulationCanvas` with the black hole and photon sphere meshes.
4.  **Ray Generation**: Connect `buildRays` to the simulation state.
5.  **Animation Loop**: Implement `requestAnimationFrame` to increment a `time` index.
6.  **Visual Polish**: Add the glow sprite, the starfield background, and the "Redshift" coloring logic.
7.  **UI**: Build the control panel to manipulate $M$, $b$, and emission modes.

## 7. Mathematical Verification
When testing the app, verify:
- If Mass = 1.0, capture should happen at $b < 5.196$.
- If $b = 5.2$, the ray should wrap around the black hole multiple times (Zoom-whirl behavior).
- Rays passing close to the black hole should visually bend towards it.