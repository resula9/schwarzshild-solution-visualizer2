import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RayPath } from '../types';
import { WORLD_SCALE } from '../services/physics';

interface SimulationCanvasProps {
  rays: RayPath[];
  mass: number;
  time: number; // Current step index
  setMaxTime: (t: number) => void;
  photonSize: number;
  width?: string;
  height?: string;
}

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ 
  rays, 
  mass,
  time, 
  setMaxTime,
  photonSize
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Three.js instances refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rayObjectsRef = useRef<any[]>([]); // Store mesh references
  
  // Geometry refs for updates
  const horizonMeshRef = useRef<THREE.Mesh | null>(null);
  const photonSphereMeshRef = useRef<THREE.Mesh | null>(null);
  const photonEquatorMeshRef = useRef<THREE.Mesh | null>(null);
  const accretionGlowRef = useRef<THREE.Sprite | null>(null);

  // Initialize Three.js
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050714); // Very dark blue/black

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(12, 10, 18);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: true,
      alpha: false,
      logarithmicDepthBuffer: true // Helps with z-fighting
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 100;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // Lighting
    const ambLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambLight);
    
    // Sun-like light
    const mainLight = new THREE.PointLight(0xffffff, 1, 0);
    mainLight.position.set(50, 50, 50);
    scene.add(mainLight);

    // Background Stars
    const starsGeom = new THREE.BufferGeometry();
    const starCount = 3000;
    const starPos = new Float32Array(starCount * 3);
    for(let i=0; i<starCount * 3; i++) {
        // Distribute in a large sphere
        const r = 100 + Math.random() * 100;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        starPos[i] = r * Math.sin(phi) * Math.cos(theta); // x
        starPos[i+1] = r * Math.sin(phi) * Math.sin(theta); // y
        starPos[i+2] = r * Math.cos(phi); // z
    }
    starsGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starsMat = new THREE.PointsMaterial({color: 0x88ccff, size: 0.15, transparent: true, opacity: 0.8});
    const stars = new THREE.Points(starsGeom, starsMat);
    scene.add(stars);

    // --- VISUAL ELEMENTS ---

    // 1. Accretion Glow (Backlight for the Black Hole)
    // We render this BEHIND the black hole to make the black hole visible by contrast
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(200, 220, 255, 0.8)');
      grad.addColorStop(0.3, 'rgba(100, 150, 255, 0.3)');
      grad.addColorStop(0.6, 'rgba(50, 50, 100, 0.05)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,128,128);
    }
    const glowTex = new THREE.CanvasTexture(canvas);
    const glowMat = new THREE.SpriteMaterial({ 
      map: glowTex, 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glowSprite = new THREE.Sprite(glowMat);
    scene.add(glowSprite);
    accretionGlowRef.current = glowSprite;

    // 2. Event Horizon (The Void)
    // Pure black, opaque. Consumes everything behind it.
    const horizonGeom = new THREE.SphereGeometry(1, 64, 64);
    const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const horizon = new THREE.Mesh(horizonGeom, horizonMat);
    scene.add(horizon);
    horizonMeshRef.current = horizon;

    // 3. Photon Sphere (Reference Boundary)
    const photonGeom = new THREE.SphereGeometry(1, 48, 48);
    const photonMat = new THREE.MeshBasicMaterial({ 
      color: 0x44ffff, 
      transparent: true, 
      opacity: 0.05, 
      wireframe: true 
    });
    const photonSphere = new THREE.Mesh(photonGeom, photonMat);
    scene.add(photonSphere);
    photonSphereMeshRef.current = photonSphere;

    // 4. Accretion Disk / Orbital Plane Visualizer
    const ringGeom = new THREE.RingGeometry(1.5, 5.0, 128);
    const ringMat = new THREE.MeshBasicMaterial({ 
      color: 0xffaa44, 
      transparent: true, 
      opacity: 0.08, 
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);
    photonEquatorMeshRef.current = ring;

    // Save refs
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    // Handle Resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      horizonGeom.dispose();
      photonGeom.dispose();
      ringGeom.dispose();
      glowMat.dispose();
      glowTex.dispose();
    };
  }, []);

  // Update Geometry Scales based on Mass
  useEffect(() => {
    if (!horizonMeshRef.current || !photonSphereMeshRef.current || !photonEquatorMeshRef.current || !accretionGlowRef.current) return;

    // R_horizon = 2 * M
    const rHorizon = 2.0 * mass * WORLD_SCALE;
    
    // Scale Horizon Mesh (Base radius 1) -> 2M
    horizonMeshRef.current.scale.set(rHorizon, rHorizon, rHorizon);

    // Scale Photon Sphere Mesh (Base radius 1) -> 3M
    const rPhoton = 3.0 * mass * WORLD_SCALE;
    photonSphereMeshRef.current.scale.set(rPhoton, rPhoton, rPhoton);

    // Scale Ring
    // Inner = 1.5 * 2M = 3M (Exactly at Photon Sphere)
    photonEquatorMeshRef.current.scale.set(rHorizon, rHorizon, 1);
    
    // Scale Glow (Needs to be larger than horizon to create the rim effect)
    const rGlow = rHorizon * 5.5;
    accretionGlowRef.current.scale.set(rGlow, rGlow, 1);

  }, [mass]);

  // Update Rays when `rays` prop changes
  useEffect(() => {
    if (!sceneRef.current) return;

    // Cleanup old rays
    rayObjectsRef.current.forEach(obj => {
      sceneRef.current?.remove(obj.dimLine);
      sceneRef.current?.remove(obj.brightLine);
      sceneRef.current?.remove(obj.photon);
    });
    rayObjectsRef.current = [];

    // Compute max steps for parent
    let maxT = 0;
    rays.forEach(r => {
      if (r.points.length - 1 > maxT) maxT = r.points.length - 1;
    });
    setMaxTime(maxT);

    // Build new 3D objects
    rays.forEach(ray => {
      if (ray.points.length < 2) return;

      const fullPoints = ray.points.map(p => {
        return new THREE.Vector3(p.x * WORLD_SCALE, p.y * WORLD_SCALE, p.z * WORLD_SCALE);
      });

      // 1. Faint Trail (Full Path)
      // Dim trail always shows the fate color (or maybe yellow? user said "make all fotons yellow")
      // To preserve the "scientific foresight" but respect "visual appearance", let's keep dim trail transparent fate color
      // but maybe very faint so the yellow head dominates.
      const dimGeom = new THREE.BufferGeometry().setFromPoints(fullPoints);
      const dimMat = new THREE.LineBasicMaterial({ color: ray.color, transparent: true, opacity: 0.1 });
      const dimLine = new THREE.Line(dimGeom, dimMat);
      sceneRef.current?.add(dimLine);

      // 2. Bright Trail (Active Path) - Starts Yellow
      const brightGeom = new THREE.BufferGeometry();
      brightGeom.setFromPoints(fullPoints); 
      brightGeom.setDrawRange(0, 0); 

      const brightMat = new THREE.LineBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.9, linewidth: 2 });
      const brightLine = new THREE.Line(brightGeom, brightMat);
      sceneRef.current?.add(brightLine);

      // 3. Photon Head - Starts Yellow
      const photonGeom = new THREE.SphereGeometry(1, 16, 16);
      const photonMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
      const photon = new THREE.Mesh(photonGeom, photonMat);
      photon.scale.set(photonSize, photonSize, photonSize);
      photon.visible = false;
      sceneRef.current?.add(photon);

      rayObjectsRef.current.push({
        ray,
        fullPoints,
        dimLine,
        brightLine,
        brightGeom, 
        photon,
        revealed: false // State for color transition
      });
    });

  }, [rays, setMaxTime]); 

  // Separate effect for photon size
  useEffect(() => {
    rayObjectsRef.current.forEach(obj => {
      if (obj.photon) {
        obj.photon.scale.set(photonSize, photonSize, photonSize);
      }
    });
  }, [photonSize]);

  // Update Animation State
  useEffect(() => {
    rayObjectsRef.current.forEach(obj => {
      const { ray, fullPoints, brightGeom, photon, brightLine } = obj;
      
      const idx = Math.min(Math.floor(time), ray.points.length - 1);
      
      // If index is invalid, hide
      if (idx < 0) {
        photon.visible = false;
        brightGeom.setDrawRange(0, 0);
        obj.revealed = false;
        return;
      }
      
      // Reset color state if back at start
      if (idx === 0) {
        obj.revealed = false;
      }

      const logicPt = ray.points[idx];
      
      // Color Update Logic
      // Check if photon has entered the "Interaction Zone"
      const interactionRadius = 15.0 * mass;
      if (!obj.revealed && logicPt.r < interactionRadius) {
        obj.revealed = true;
      }
      
      // Apply Color
      const displayColor = obj.revealed ? ray.color : "#eab308"; // Default Yellow (#eab308)
      photon.material.color.set(displayColor);
      brightLine.material.color.set(displayColor);


      // Horizon check: If it's effectively inside the horizon radius, it should vanish
      const isInside = logicPt.r < (2.05 * mass);

      // Position
      const pt = fullPoints[idx];
      photon.position.copy(pt);
      
      // Visibility: Only visible if outside (or on the boundary)
      photon.visible = !isInside;

      // Scale effect: Shrink slightly as it hits the horizon
      if (isInside) {
         photon.scale.set(0,0,0);
      } else {
         photon.scale.set(photonSize, photonSize, photonSize);
      }

      // Trail
      brightGeom.setDrawRange(0, idx + 1);
      brightGeom.attributes.position.needsUpdate = true;
    });

  }, [time, mass, photonSize]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px] relative bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10">
      <canvas ref={canvasRef} className="w-full h-full block" />
      
      {/* Overlay Information */}
      <div className="absolute top-4 left-4 pointer-events-none space-y-1">
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 rounded-full bg-black border border-gray-600 shadow-[0_0_10px_rgba(0,0,0,1)]"></div>
           <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Event Horizon (2M)</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 rounded-full border border-cyan-500/50 bg-transparent"></div>
           <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Photon Sphere (3M)</span>
        </div>
      </div>
    </div>
  );
};

export default SimulationCanvas;
