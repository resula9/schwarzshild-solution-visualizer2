# Schwarzschild Geodesic Simulator

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-cyan)
![Three.js](https://img.shields.io/badge/Three.js-r160-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

A high-fidelity, interactive 3D simulation of **null geodesics** (light rays) navigating the curved spacetime of a static, non-rotating black hole. This application solves the geodesic equations of the **Schwarzschild metric** in real-time to visualize gravitational lensing, photon capture, and gravitational redshift.

## 🌌 Overview

Black holes warp spacetime so intensely that light itself bends. This simulator allows users to explore these relativistic effects intuitively. By adjusting the mass of the black hole and the trajectory of incoming photons, you can observe:
- **Gravitational Lensing**: Light bending around the massive object.
- **The Photon Sphere**: The unstable orbit where light circles the black hole ($r = 3M$).
- **The Event Horizon**: The point of no return ($r = 2M$).
- **Gravitational Redshift**: The shift in light color as it climbs out of or falls into the gravity well.

## ✨ Features

### 🔭 Physics Engine
- **Real-time Numerical Integration**: Solves the geodesic differential equations for massless particles using a custom symplectic-like integrator.
- **Accurate Metric Handling**: Simulates the effective potential $V_{eff}(r) = \frac{L^2}{r^2}(1 - \frac{2M}{r})$.
- **Variable Geometry**: Dynamically adjusts the Event Horizon and Photon Sphere radii based on the user-defined mass ($M$).

### 🎨 3D Visualization
- **Immersive Environment**: Rendered in WebGL using **Three.js**.
- **Accurate Scales**:
  - **Black Sphere**: The Event Horizon ($2M$).
  - **Cyan Wireframe**: The Photon Sphere ($3M$).
  - **Accretion Disk**: Shader-based procedural plasma visualization.
- **Structural Visibility Control**: Toggle the visibility of the black hole structure. When hidden, an advanced **Holdout Mask** is applied, rendering the event horizon invisible while still correctly occluding background stars to create a realistic "void".

### 🌈 Gravitational Redshift & Coloring
Photons dynamically change color based on their radial distance from the singularity, simulating gravitational redshift/blueshift effects:
- ⚪ **Blue/White**: Far field ($r > 10M$).
- 🟡 **Yellow/Gold**: Approaching the photon sphere ($r \approx 4M$).
- 🔴 **Deep Red**: Near the event horizon ($r < 2.5M$).

### 🚀 High Performance
- **Optimized Rendering**: Supports up to **1000 simultaneous light rays**.
- **Geometry Instancing**: Efficiently manages memory by sharing geometries and materials across particle systems.

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/schwarzschild-simulator.git
   cd schwarzschild-simulator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` (or the port shown in your terminal) to view the app.

## 📚 Scientific Background

### The Schwarzschild Metric
The simulation is based on the solution to Einstein's field equations for a spherical, non-rotating mass. The effective potential for a photon is given by:

$$ \frac{1}{b^2} = \frac{1}{r^4} \left(\frac{dr}{d\phi}\right)^2 + \frac{1}{r^2}\left(1 - \frac{2M}{r}\right) $$

Where:
- $b$ is the impact parameter (distance of closest approach if gravity were turned off).
- $M$ is the mass of the black hole ($G=c=1$ units).

### Critical Thresholds
- **Event Horizon ($r_s = 2M$)**: Any photon crossing this boundary can never return.
- **Photon Sphere ($r_{ph} = 3M$)**: Light can orbit the black hole here, but the orbit is unstable.
- **Critical Impact Parameter ($b_{crit} = 3\sqrt{3}M \approx 5.196M$)**:
  - If $b < b_{crit}$, the photon is captured.
  - If $b > b_{crit}$, the photon escapes (scattered).
  - If $b = b_{crit}$, the photon spirals asymptotically into the photon sphere.

## 🎮 Usage Guide

### The Interface
1. **Simulation Canvas (Left)**: The 3D view. Drag to rotate, scroll to zoom.
2. **Control Panel (Right)**:
   - **Timeline**: Scrub back and forth to see the path evolution.
   - **Physics Settings**: 
     - Change the **Mass** to make the black hole larger.
     - Adjust **Impact Parameter (b)** to aim closer or further from the center.
   - **Ray Count**: Scale up to 1000 rays for high-density simulations.
   - **Visuals**: Toggle "Event Horizon" to see the raw photon paths against the starfield with a realistic shadow.

### Visual Cues
- **Redshift**: Watch as rays transition from blue to red as they dive into the gravity well.
- **Occlusion**: Even when the black hole mesh is hidden, the background stars are blocked by the event horizon, simulating the absence of light coming from behind the hole.

## 🛠 Tech Stack

- **Frontend Framework**: React 18
- **Language**: TypeScript
- **3D Engine**: Three.js
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite (recommended) / Create React App

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.