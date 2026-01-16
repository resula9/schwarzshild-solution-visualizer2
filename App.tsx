import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout, Info, AlertTriangle } from 'lucide-react';
import Controls from './components/Controls';
import SimulationCanvas from './components/SimulationCanvas';
import { buildRays, getCriticalB } from './services/physics';
import { RayPath, DistributionMode, ImpactMode } from './types';

const App: React.FC = () => {
  // --- Simulation State ---
  const [mass, setMass] = useState<number>(1.0);
  const [b, setB] = useState<number>(4.0);
  const [rayCount, setRayCount] = useState<number>(7);
  const [seed, setSeed] = useState<number>(Date.now());
  const [speed, setSpeed] = useState<number>(1.0);
  const [photonSize, setPhotonSize] = useState<number>(0.04);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isContinuous, setIsContinuous] = useState<boolean>(false);
  const [distributionMode, setDistributionMode] = useState<DistributionMode>('isotropic'); 
  const [impactMode, setImpactMode] = useState<ImpactMode>('fixed');
  const [time, setTime] = useState<number>(0);
  const [maxTime, setMaxTime] = useState<number>(100);
  const [showEventHorizon, setShowEventHorizon] = useState<boolean>(true);

  // Computed State
  const [rays, setRays] = useState<RayPath[]>([]);

  // Refs for animation loop
  const requestRef = useRef<number>(0);
  const timeRef = useRef<number>(0); 
  
  // Initialize / Update Rays
  useEffect(() => {
    const newRays = buildRays(b, mass, rayCount, seed, distributionMode, impactMode);
    setRays(newRays);
    
    // Reset time when physics change manually (if not playing)
    if (!isPlaying && !isContinuous) {
      setTime(0);
      timeRef.current = 0;
    }
  }, [b, mass, rayCount, seed, distributionMode, impactMode]);

  // Animation Loop
  const animate = useCallback(() => {
    // If continuous mode is on, we just keep increasing time indefinitely
    // The visual loop logic happens inside SimulationCanvas using modulo
    if (isContinuous || timeRef.current < maxTime) {
      timeRef.current += speed;
      setTime(timeRef.current);
      requestRef.current = requestAnimationFrame(animate);
    } else {
      setIsPlaying(false);
      timeRef.current = maxTime;
      setTime(maxTime);
    }
  }, [maxTime, speed, isContinuous]);

  useEffect(() => {
    if (isPlaying || isContinuous) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, isContinuous, animate]);

  // Handlers
  const handleReset = () => {
    setIsPlaying(false);
    setIsContinuous(false); // Reset mode too
    timeRef.current = 0;
    setTime(0);
  };

  const handleSeek = (val: number) => {
    setTime(val);
    timeRef.current = val;
  };

  const handleRandomize = () => {
    setSeed(Date.now());
    handleReset();
  };

  const toggleContinuous = () => {
     const newState = !isContinuous;
     setIsContinuous(newState);
     // If turning on, we don't necessarily reset time, but we ensure it keeps running
     if (newState) {
       setIsPlaying(false); // Disable standard play state to avoid conflict
     }
  };

  // Status Logic
  const anyInside = rays.some(r => {
    // In continuous mode, checks are tricky because indices vary.
    // We disable this specific warning or just check "if any ray IS CURRENTLY inside"
    // For simplicity, we keep standard check but it might flicker in continuous mode.
    // Let's use standard logic but adapted index.
    if (isContinuous) return false; // Disable warning in continuous mode to avoid noise
    
    const idx = Math.min(Math.floor(time), r.points.length - 1);
    return idx >= 0 && r.points[idx].crossed;
  });

  const bCrit = getCriticalB(mass);

  const getStatusText = () => {
    if (isContinuous) return "Continuous Flow Active";
    const trapped = rays.filter(r => r.crossed).length;
    const escaped = rays.filter(r => r.escaped).length;
    
    if (trapped > 0) return `${trapped}/${rays.length} trapped in horizon`;
    if (escaped === rays.length) return "All rays escaped";
    return "Simulating...";
  };

  return (
    <div className="min-h-screen bg-space-900 text-white font-sans selection:bg-cyan-500/30">
      
      {/* Header */}
      <header className="border-b border-white/10 bg-space-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-lg shadow-lg shadow-cyan-900/20">
              <Layout size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">Schwarzschild <span className="text-cyan-400">Geodesics</span></h1>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-mono">General Relativity Simulator</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-xs font-mono text-white/40">
            <span>R_s = {(2*mass).toFixed(2)}</span>
            <span>R_ph = {(3*mass).toFixed(2)}</span>
            <span>b_crit ≈ {bCrit.toFixed(3)}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Visualization */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative h-[500px] lg:h-[600px] w-full">
             <SimulationCanvas 
                rays={rays} 
                mass={mass}
                time={time} 
                setMaxTime={setMaxTime}
                photonSize={photonSize}
                isContinuous={isContinuous}
                showEventHorizon={showEventHorizon}
             />
             
             {/* Dynamic Warnings Overlay */}
             {anyInside && (
               <div className="absolute bottom-6 left-6 right-6 bg-red-950/80 backdrop-blur border border-red-500/30 p-3 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
                 <div>
                   <h3 className="text-sm font-bold text-red-200">Event Horizon Crossed</h3>
                   <p className="text-xs text-red-300/80 mt-1 leading-relaxed">
                     Inside r={(2*mass).toFixed(1)}, the radial coordinate becomes timelike. All future-directed paths lead inevitably to the singularity. Escape is impossible.
                   </p>
                 </div>
               </div>
             )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-space-800/50 border border-white/5 rounded-lg p-4 flex items-center gap-3">
               <Info size={18} className="text-cyan-500/70" />
               <div>
                 <div className="text-xs text-white/40 font-mono uppercase">Simulation Status</div>
                 <div className="text-sm font-medium text-white/90">{getStatusText()}</div>
               </div>
            </div>
             <div className="bg-space-800/50 border border-white/5 rounded-lg p-4 flex items-center justify-between">
               <div>
                 <div className="text-xs text-white/40 font-mono uppercase">Critical Impact Parameter</div>
                 <div className="text-sm font-medium text-white/90">b &lt; {bCrit.toFixed(4)} <span className="text-white/40">→ Capture</span></div>
               </div>
               <div className={`w-2 h-2 rounded-full ${b < bCrit ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-emerald-500 shadow-[0_0_8px_emerald]'}`}></div>
            </div>
          </div>
        </div>

        {/* Right Column: Controls */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
             <Controls 
                mass={mass} setMass={setMass}
                b={b} setB={setB}
                rayCount={rayCount} setRayCount={setRayCount}
                speed={speed} setSpeed={setSpeed}
                photonSize={photonSize} setPhotonSize={setPhotonSize}
                isPlaying={isPlaying} togglePlay={() => { setIsPlaying(!isPlaying); setIsContinuous(false); }}
                isContinuous={isContinuous} toggleContinuous={toggleContinuous}
                onReset={handleReset}
                onSeek={handleSeek}
                onRandomize={handleRandomize}
                distributionMode={distributionMode}
                setDistributionMode={setDistributionMode}
                impactMode={impactMode}
                setImpactMode={setImpactMode}
                progress={time}
                maxSteps={maxTime}
                bCrit={bCrit}
                showEventHorizon={showEventHorizon}
                toggleEventHorizon={() => setShowEventHorizon(!showEventHorizon)}
             />
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;