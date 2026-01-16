import { Point3D, RayPath, DistributionMode, ImpactMode } from '../types';

export const WORLD_SCALE = 0.08;

// These depend on mass now, so we export functions or calculate dynamically
export function getCriticalB(mass: number) {
  return 3 * Math.sqrt(3) * mass;
}

export function getEventHorizonRadius(mass: number) {
  return 2.0 * mass;
}

export function getPhotonSphereRadius(mass: number) {
  return 3.0 * mass;
}

interface TrajectoryOptions {
  dLambda?: number;
  maxSteps?: number;
  rStart?: number;
  phi0?: number;
}

function computeTrajectory(b: number, mass: number, opts: TrajectoryOptions = {}): { points: Omit<Point3D, 'x'|'y'|'z'>[], crossed: boolean, escaped: boolean, turned: boolean } {
  const dLambda = opts.dLambda ?? 0.05;
  const maxSteps = opts.maxSteps ?? 6000;
  const rStart = opts.rStart ?? 100;
  const phi0 = opts.phi0 ?? 0;

  const rEscape = 150;
  // Horizon is at 2M. We set limit slightly above 2M to avoid singularity in numerical integration.
  const rHorizonLimit = 2.01 * mass; 
  
  let r = rStart;
  let phi = phi0;
  
  let crossed = false;
  let escaped = false;
  let turned = false;
  let prevDr = -1;
  
  const points: Omit<Point3D, 'x'|'y'|'z'>[] = [];

  for (let i = 0; i < maxSteps; i++) {
    if (r > rEscape) {
      escaped = true;
      points.push({ r, phi, crossed, escaped: true, turned });
      break;
    }
    if (r < rHorizonLimit) {
      crossed = true;
      points.push({ r, phi, crossed: true, escaped, turned });
      break;
    }
    
    // Schwarzschild Effective Potential for Null Geodesics:
    // (dr/dlambda)^2 = E^2 - V_eff
    // V_eff = (L^2/r^2) * (1 - 2M/r)
    // b = L/E
    // (dr/dlambda)^2 / E^2 = 1 - (b^2/r^2)(1 - 2M/r)
    
    const f = 1 - (2 * mass) / r;
    const effectivePotentialTerm = (b * b * f) / (r * r);
    const F = 1 - effectivePotentialTerm;

    if (F < 0) {
      turned = true;
      points.push({ r, phi, crossed, escaped, turned: true });
      prevDr = 0;
      
      const eps = 1e-8;
      const dr = Math.sqrt(Math.max(0, -F) + eps);
      const dphi = b / (r * r);
      
      r = r + dr * dLambda;
      phi = phi + dphi * dLambda;
      continue;
    }

    const drMag = Math.sqrt(F);
    const dr = turned ? drMag : -drMag;

    if (prevDr < 0 && dr > 0) turned = true;
    prevDr = dr;

    const dphi = b / (r * r);
    
    r = r + dr * dLambda;
    phi = phi + dphi * dLambda;
    
    points.push({ r, phi, crossed, escaped, turned });

    if (!isFinite(r) || !isFinite(phi)) break;
  }

  if (points.length === maxSteps) {
    const last = points[points.length - 1];
    const prev = points[Math.max(0, points.length - 20)];
    if (last && last.r > 50 && last.r > prev.r) escaped = true;
  }

  for (let j = 0; j < points.length; j++) {
    points[j].crossed = crossed;
    points[j].escaped = escaped;
    points[j].turned = turned;
  }

  return { points, crossed, escaped, turned };
}

function mulberry32(a: number) {
  return function() {
    let t = a += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

export function buildRays(b: number, mass: number, count: number, seed: number, distMode: DistributionMode, impactMode: ImpactMode): RayPath[] {
  const rng = mulberry32(seed);
  const result: RayPath[] = [];
  const bCrit = 3 * Math.sqrt(3) * mass;
  
  for (let i = 0; i < count; i++) {
    // Determine orientation angles
    let theta: number; // Polar angle for start position (from Y axis)
    let phi_sphere: number; // Azimuthal angle for start position (around Y axis)
    let psi: number; // Plane rotation angle (spin around the radial vector)

    if (distMode === 'isotropic') {
       // Random point on sphere: z = 2*rng-1, theta = acos(z)
       theta = Math.acos(2 * rng() - 1);
       phi_sphere = rng() * Math.PI * 2;
       // Random orbital plane orientation
       psi = rng() * Math.PI * 2; 
    } else if (distMode === 'planar') {
       // 2D Plane mode (Equatorial Plane)
       theta = Math.PI / 2; // On equator
       phi_sphere = rng() * Math.PI * 2; // Random spot on the ring
       psi = 0; // No tilt, keep orbit in the equatorial plane
    } else {
       // Beam Mode (Point Source / Focused)
       // Start at North Pole
       theta = 0; 
       phi_sphere = 0;
       // Distribute plane angles uniformly to create a clean cone/bundle effect
       // If count is 1, psi=0.
       psi = (i / Math.max(1, count)) * Math.PI * 2; 
    }

    // Determine Impact Parameter for this ray
    let currentB = b;
    if (impactMode === 'random') {
       // Random range: [2.5 * M, 7.5 * M]
       // Covers the critical value (~5.2 * M) well
       const minB = 2.5 * mass;
       const maxB = 7.5 * mass;
       currentB = minB + rng() * (maxB - minB);
    }

    // Compute planar trajectory starting at r=100, phi=0
    const res = computeTrajectory(currentB, mass, { dLambda: 0.05, maxSteps: 6000, rStart: 100, phi0: 0 });
    
    // Determine color based on trajectory fate
    let color: string;
    if (res.crossed) {
        // Trapped in event horizon
        color = "#ff3333"; // Red
    } else {
        // Escaped
        // "Around critical" but not trapped.
        // If b is within 25% of critical value, consider it "influenced" enough to be blue
        if (currentB < 1.25 * bCrit) {
            color = "#4488ff"; // Blue (Strong lensing/deflection)
        } else {
            color = "#eab308"; // Yellow (Safe pass)
        }
    }

    // Transform points from local planar 2D to global 3D
    const points3D: Point3D[] = res.points.map(p => {
      // 0. Local plane coordinates (Trajectory lies in local XY plane initially)
      const lx = p.r * Math.cos(p.phi);
      const ly = p.r * Math.sin(p.phi);
      const lz = 0;
      
      // 1. Rotate around local X by psi (Spin the orbital plane)
      const x1 = lx;
      const y1 = ly * Math.cos(psi) - lz * Math.sin(psi);
      const z1 = ly * Math.sin(psi) + lz * Math.cos(psi);
      
      // 2. Rotate around Y by beta = theta - PI/2
      //    (Tilts the "North Pole" of our system to match the target latitude theta)
      const beta = theta - Math.PI/2;
      const cb = Math.cos(beta);
      const sb = Math.sin(beta);
      const x2 = x1 * cb + z1 * sb;
      const z2 = -x1 * sb + z1 * cb;
      const y2 = y1;
      
      // 3. Rotate around Z by phi_sphere
      //    (Rotates to the correct longitude)
      const cp = Math.cos(phi_sphere);
      const sp = Math.sin(phi_sphere);
      const x = x2 * cp - y2 * sp;
      const y = x2 * sp + y2 * cp;
      const z = z2;

      return {
        ...p,
        x,
        y,
        z
      };
    });
    
    result.push({
      id: `${seed}-${i}`,
      b: currentB,
      phi0: 0,
      color,
      points: points3D,
      crossed: res.crossed,
      escaped: res.escaped,
      turned: res.turned,
      timeOffset: Math.floor(rng() * 400) // Random start offset for continuous mode
    });
  }
  return result;
}