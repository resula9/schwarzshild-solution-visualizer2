import React, { useEffect, useRef, useMemo } from 'react';
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
  isContinuous: boolean;
  showEventHorizon: boolean;
}

// Vertex Shader for Accretion Disk
const DISK_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment Shader for Accretion Disk (Procedural Plasma/Noise)
const DISK_FRAGMENT_SHADER = `
  varying vec2 vUv;
  varying vec3 vPos;
  uniform float time;
  uniform vec3 colorInner;
  uniform vec3 colorOuter;

  // Simple pseudo-noise function
  float rand(vec2 n) { 
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
  }

  float noise(vec2 p){
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u*u*(3.0-2.0*u);
    float res = mix(
      mix(rand(ip), rand(ip+vec2(1.0,0.0)), u.x),
      mix(rand(ip+vec2(0.0,1.0)), rand(ip+vec2(1.0,1.0)), u.x), u.y);
    return res*res;
  }

  void main() {
    // Polar coordinates
    vec2 centered = vUv - 0.5;
    float r = length(centered) * 2.0; // 0 to 1 approx
    float angle = atan(centered.y, centered.x);

    // Animation rotation
    float rot = time * 0.2;
    float n1 = noise(vec2(r * 10.0 - rot * 2.0, angle * 5.0 + rot));
    float n2 = noise(vec2(r * 20.0 + rot, angle * 10.0 - rot));
    
    float intensity = (n1 + n2) * 0.5;
    
    // Gradient from inner (hot) to outer (cool)
    vec3 color = mix(colorInner, colorOuter, r);
    
    // Soft edges
    float alpha = smoothstep(0.2, 0.3, r) * (1.0 - smoothstep(0.8, 1.0, r));
    
    // Boost intensity for bloom feel
    gl_FragColor = vec4(color * (intensity + 0.5), alpha * 0.8 * intensity);
  }
`;

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ 
  rays, 
  mass,
  time, 
  setMaxTime,
  photonSize,
  isContinuous,
  showEventHorizon
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
  const accretionDiskRef = useRef<THREE.Mesh | null>(null);
  const accretionGlowRef = useRef<THREE.Sprite | null>(null);
  const accretionMaterialRef = useRef<THREE.ShaderMaterial | null>(null);

  // Initialize Three.js
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020205); // Deep space

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(12, 8, 16);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      antialias: true,
      alpha: false,
      logarithmicDepthBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 100;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.2;

    // Lighting
    const ambLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambLight);

    // Background Stars (High density for realistic occlusion)
    const starsGeom = new THREE.BufferGeometry();
    const starCount = 5000;
    const starPos = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    for(let i=0; i<starCount; i++) {
        const r = 80 + Math.random() * 100;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        starPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        starPos[i*3+2] = r * Math.cos(phi);
        starSizes[i] = Math.random() * 0.2 + 0.05;
    }
    starsGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starsGeom.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
    const starsMat = new THREE.PointsMaterial({color: 0xffffff, size: 0.1, sizeAttenuation: true, transparent: true, opacity: 0.8});
    const stars = new THREE.Points(starsGeom, starsMat);
    scene.add(stars);

    // --- VISUAL ELEMENTS ---

    // 1. Accretion Glow (Backlight/Atmosphere)
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

    // 2. Accretion Disk (Shader based)
    const diskGeom = new THREE.PlaneGeometry(1, 1, 64, 64);
    const diskMat = new THREE.ShaderMaterial({
      vertexShader: DISK_VERTEX_SHADER,
      fragmentShader: DISK_FRAGMENT_SHADER,
      uniforms: {
        time: { value: 0 },
        colorInner: { value: new THREE.Color(0xffaa00) }, // Orange/Gold
        colorOuter: { value: new THREE.Color(0xaa0000) }, // Reddish
      },
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false, // Glow effect
      blending: THREE.AdditiveBlending
    });
    const disk = new THREE.Mesh(diskGeom, diskMat);
    disk.rotation.x = -Math.PI / 2;
    scene.add(disk);
    accretionDiskRef.current = disk;
    accretionMaterialRef.current = diskMat;

    // 3. Event Horizon (The Void)
    const horizonGeom = new THREE.SphereGeometry(1, 64, 64);
    const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const horizon = new THREE.Mesh(horizonGeom, horizonMat);
    scene.add(horizon);
    horizonMeshRef.current = horizon;

    // 4. Photon Sphere (Reference Boundary)
    const photonGeom = new THREE.SphereGeometry(1, 48, 48);
    const photonMat = new THREE.MeshBasicMaterial({ 
      color: 0x44ffff, 
      transparent: true, 
      opacity: 0.03, 
      wireframe: true 
    });
    const photonSphere = new THREE.Mesh(photonGeom, photonMat);
    scene.add(photonSphere);
    photonSphereMeshRef.current = photonSphere;

    // Save refs
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      
      // Update Uniforms
      if (accretionMaterialRef.current) {
        accretionMaterialRef.current.uniforms.time.value += 0.01;
      }

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
      diskGeom.dispose();
      diskMat.dispose();
      glowMat.dispose();
      glowTex.dispose();
    };
  }, []);

  // Update Event Horizon Material AND other components based on visibility
  useEffect(() => {
    // 1. Event Horizon logic (Holdout vs Black)
    if (horizonMeshRef.current) {
      const mat = horizonMeshRef.current.material as THREE.MeshBasicMaterial;
      if (showEventHorizon) {
        mat.color.setHex(0x000000);
        mat.colorWrite = true;
        mat.transparent = false;
        mat.opacity = 1.0;
      } else {
        // Holdout mask: Invisible but writes to depth buffer to occlude stars
        mat.colorWrite = false; 
        mat.depthWrite = true;  
      }
      horizonMeshRef.current.visible = true;
    }

    // 2. Hide other structural elements when "Hidden" mode is active
    if (photonSphereMeshRef.current) {
        photonSphereMeshRef.current.visible = showEventHorizon;
    }
    if (accretionDiskRef.current) {
        accretionDiskRef.current.visible = showEventHorizon;
    }
    if (accretionGlowRef.current) {
        accretionGlowRef.current.visible = showEventHorizon;
    }

  }, [showEventHorizon]);

  // Update Geometry Scales based on Mass
  useEffect(() => {
    if (!horizonMeshRef.current || !photonSphereMeshRef.current || !accretionDiskRef.current || !accretionGlowRef.current) return;

    const rHorizon = 2.0 * mass * WORLD_SCALE;
    horizonMeshRef.current.scale.set(rHorizon, rHorizon, rHorizon);

    const rPhoton = 3.0 * mass * WORLD_SCALE;
    photonSphereMeshRef.current.scale.set(rPhoton, rPhoton, rPhoton);

    // Accretion Disk scales: Inner ~ 2.5M, Outer ~ 8M
    const scale = 12.0 * mass * WORLD_SCALE; 
    accretionDiskRef.current.scale.set(scale, scale, 1);
    
    // Scale Glow
    const rGlow = rHorizon * 5.5;
    accretionGlowRef.current.scale.set(rGlow, rGlow, 1);

  }, [mass]);

  // Update Rays with Redshift Coloring
  useEffect(() => {
    if (!sceneRef.current) return;

    // Cleanup previous rays
    if (rayObjectsRef.current.length > 0) {
      // 1. Dispose Shared Resources (stored on the first object)
      const first = rayObjectsRef.current[0];
      if (first.photon?.geometry) first.photon.geometry.dispose();
      if (first.brightLine?.material) (first.brightLine.material as THREE.Material).dispose();
      if (first.dimLine?.material) (first.dimLine.material as THREE.Material).dispose();

      // 2. Dispose Unique Resources per Object
      rayObjectsRef.current.forEach(obj => {
        sceneRef.current?.remove(obj.brightLine);
        sceneRef.current?.remove(obj.dimLine);
        sceneRef.current?.remove(obj.photon);
        
        obj.brightLine?.geometry?.dispose();
        obj.dimLine?.geometry?.dispose();
        obj.photon?.material?.dispose();
      });
    }
    rayObjectsRef.current = [];

    // Max Time Calc
    let maxT = 0;
    rays.forEach(r => { if (r.points.length - 1 > maxT) maxT = r.points.length - 1; });
    setMaxTime(maxT);

    // Shared Resources for High Performance (1000 rays)
    const sharedPhotonGeom = new THREE.SphereGeometry(1, 12, 12); 
    const sharedBrightMat = new THREE.LineBasicMaterial({ 
      vertexColors: true, 
      transparent: true, 
      opacity: 0.8, 
      linewidth: 2 
    });
    const sharedDimMat = new THREE.LineBasicMaterial({ 
      vertexColors: true,
      transparent: true, 
      opacity: 0.1 
    });

    rays.forEach(ray => {
      if (ray.points.length < 2) return;

      const positions: number[] = [];
      const colors: number[] = [];

      ray.points.forEach(p => {
        positions.push(p.x * WORLD_SCALE, p.y * WORLD_SCALE, p.z * WORLD_SCALE);

        const rVal = p.r / mass; // r in units of M
        const c = new THREE.Color();
        
        if (rVal > 10) {
          c.setHSL(0.6, 1.0, 0.9); // Blueish White
        } else if (rVal > 4) {
          c.setHSL(0.12, 1.0, 0.6); // Gold/Yellow
        } else if (rVal > 2.2) {
          c.setHSL(0.0, 1.0, 0.4); // Red
        } else {
          c.setHSL(0.0, 1.0, 0.1); // Dark Red/Fade
        }
        
        colors.push(c.r, c.g, c.b);
      });

      // 1. Bright Trail
      const brightGeom = new THREE.BufferGeometry();
      brightGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      brightGeom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      brightGeom.setDrawRange(0, 0);

      const brightLine = new THREE.Line(brightGeom, sharedBrightMat);
      sceneRef.current?.add(brightLine);

      // 2. Dim Trail
      const dimGeom = new THREE.BufferGeometry();
      dimGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const dimColors = colors.map(c => c * 0.3);
      dimGeom.setAttribute('color', new THREE.Float32BufferAttribute(dimColors, 3));
      
      const dimLine = new THREE.Line(dimGeom, sharedDimMat);
      sceneRef.current?.add(dimLine);

      // 3. Photon Head
      const photonMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const photon = new THREE.Mesh(sharedPhotonGeom, photonMat);
      photon.scale.set(photonSize, photonSize, photonSize);
      photon.visible = false;
      sceneRef.current?.add(photon);

      rayObjectsRef.current.push({
        ray,
        positions,
        colors,
        brightLine,
        brightGeom,
        dimLine,
        dimGeom,
        photon,
        revealed: false
      });
    });

  }, [rays, setMaxTime, mass]);

  // Animation & Visibility Updates
  useEffect(() => {
    rayObjectsRef.current.forEach(obj => {
      const { ray, positions, brightGeom, photon } = obj;
      let idx: number;

      if (isContinuous) {
        const cycleLength = ray.points.length + 60; 
        const localTime = (time + ray.timeOffset) % cycleLength;
        idx = localTime < ray.points.length ? Math.floor(localTime) : -1;
      } else {
        idx = Math.min(Math.floor(time), ray.points.length - 1);
      }

      if (idx < 0) {
        photon.visible = false;
        brightGeom.setDrawRange(0, 0);
        return;
      }

      const logicPt = ray.points[idx];
      const isInside = logicPt.r < (2.02 * mass); // Just inside horizon

      // Update Photon Position
      photon.position.set(
        positions[idx*3],
        positions[idx*3+1],
        positions[idx*3+2]
      );
      
      // Update Photon Color
      const r = obj.colors[idx*3];
      const g = obj.colors[idx*3+1];
      const b = obj.colors[idx*3+2];
      photon.material.color.setRGB(r, g, b);

      // Visibility & Scale
      photon.visible = !isInside;
      if (isInside) {
        photon.scale.set(0,0,0);
      } else {
        photon.scale.set(photonSize, photonSize, photonSize);
      }

      // Draw Trail
      brightGeom.setDrawRange(0, idx + 1);
      brightGeom.attributes.position.needsUpdate = true;
    });
  }, [time, mass, photonSize, isContinuous]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px] relative bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10">
      <canvas ref={canvasRef} className="w-full h-full block" />
      
      <div className="absolute top-4 left-4 pointer-events-none space-y-1">
         {!showEventHorizon && (
            <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest animate-pulse mb-2">
               Structural Vis: OFF
            </div>
         )}
         <div className="flex items-center gap-2">
           <div className={`w-3 h-3 rounded-full border border-gray-600 shadow-[0_0_10px_rgba(0,0,0,1)] ${showEventHorizon ? 'bg-black' : 'bg-transparent border-dashed opacity-50'}`}></div>
           <span className={`text-[10px] font-mono uppercase tracking-widest transition-opacity ${showEventHorizon ? 'text-white/50' : 'text-white/20'}`}>Event Horizon (2M)</span>
        </div>
        <div className="flex items-center gap-2">
           <div className={`w-3 h-3 rounded-full border border-cyan-500/50 bg-transparent transition-opacity ${showEventHorizon ? 'opacity-100' : 'opacity-20'}`}></div>
           <span className={`text-[10px] font-mono uppercase tracking-widest transition-opacity ${showEventHorizon ? 'text-white/50' : 'text-white/20'}`}>Photon Sphere (3M)</span>
        </div>
      </div>
    </div>
  );
};

export default SimulationCanvas;