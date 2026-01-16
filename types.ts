export type DistributionMode = 'isotropic' | 'planar' | 'beam';
export type ImpactMode = 'fixed' | 'random';

export interface Point3D {
  r: number;
  phi: number;
  // Cartesian coordinates (physics units, before scaling)
  x: number;
  y: number;
  z: number;
  crossed: boolean;
  escaped: boolean;
  turned: boolean;
}

export interface RayPath {
  id: string;
  b: number; // Impact parameter
  phi0: number; // Initial angle
  color: string;
  points: Point3D[];
  crossed: boolean;
  escaped: boolean;
  turned: boolean;
}

export interface SimulationConfig {
  impactParameter: number;
  rayCount: number;
  speed: number;
  isPlaying: boolean;
  distributionMode: DistributionMode;
  impactMode: ImpactMode;
}
