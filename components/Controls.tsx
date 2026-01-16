import React from 'react';
import { Play, Pause, RotateCcw, Shuffle, Globe, Disc, Target, Equal, Dna, Eye, EyeOff, Infinity } from 'lucide-react';
import { DistributionMode, ImpactMode } from '../types';

interface ControlsProps {
  mass: number;
  setMass: (val: number) => void;
  b: number;
  setB: (val: number) => void;
  rayCount: number;
  setRayCount: (val: number) => void;
  speed: number;
  setSpeed: (val: number) => void;
  photonSize: number;
  setPhotonSize: (val: number) => void;
  isPlaying: boolean;
  togglePlay: () => void;
  isContinuous: boolean;
  toggleContinuous: () => void;
  onReset: () => void;
  onSeek: (val: number) => void;
  onRandomize: () => void;
  distributionMode: DistributionMode;
  setDistributionMode: (mode: DistributionMode) => void;
  impactMode: ImpactMode;
  setImpactMode: (mode: ImpactMode) => void;
  progress: number;
  maxSteps: number;
  bCrit: number;
  showEventHorizon: boolean;
  toggleEventHorizon: () => void;
}

const PresetButton: React.FC<{ label: string; value: number; onClick: (v: number) => void; active: boolean }> = ({ label, value, onClick, active }) => (
  <button
    onClick={() => onClick(value)}
    className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
      active 
        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' 
        : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
    }`}
  >
    {label}
  </button>
);

const Controls: React.FC<ControlsProps> = ({
  mass, setMass,
  b, setB,
  rayCount, setRayCount,
  speed, setSpeed,
  photonSize, setPhotonSize,
  isPlaying, togglePlay,
  isContinuous, toggleContinuous,
  onReset, onSeek, onRandomize,
  distributionMode, setDistributionMode,
  impactMode, setImpactMode,
  progress, maxSteps,
  bCrit,
  showEventHorizon,
  toggleEventHorizon
}) => {
  
  // Dynamic presets based on Mass
  const bPresets = [
    { label: "High", value: 8.0 * mass },
    { label: "Esc", value: 5.3 * mass },
    { label: "Crit", value: 5.2 * mass }, // Approx critical
    { label: "Cap", value: 5.1 * mass },
    { label: "Low", value: 4.0 * mass },
  ];

  const maxB = 10.0 * mass;
  const minB = 2.1 * mass;

  const distModes: { id: DistributionMode; label: string; icon: React.ReactNode }[] = [
    { id: 'beam', label: 'Beam', icon: <Target size={14} /> },
    { id: 'isotropic', label: 'Random', icon: <Globe size={14} /> },
    { id: 'planar', label: 'Plane', icon: <Disc size={14} /> },
  ];

  const impactModes: { id: ImpactMode; label: string; icon: React.ReactNode }[] = [
    { id: 'fixed', label: 'Fixed (Slider)', icon: <Equal size={14} /> },
    { id: 'random', label: 'Random (Mixed)', icon: <Dna size={14} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      
      {/* Playback Controls */}
      <div className="bg-space-700/50 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-mono text-cyan-glow/70 uppercase tracking-widest">Timeline</div>
          {!isContinuous && (
            <div className="text-xs font-mono text-white/50">{Math.floor(progress)} / {maxSteps}</div>
          )}
          {isContinuous && (
             <div className="text-xs font-mono text-amber-400/80 flex items-center gap-1">
                <Infinity size={12} /> LOOP
             </div>
          )}
        </div>

        {/* Video Scrubber - Disabled in Continuous Mode */}
        <div className={`relative w-full h-5 mb-4 group flex items-center ${isContinuous ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
            {/* Background Track */}
            <div className="absolute w-full h-1.5 bg-space-900 rounded-full overflow-hidden border border-white/5">
                {/* Progress Fill */}
                <div 
                   className="h-full bg-cyan-500/60 shadow-[0_0_10px_rgba(34,211,238,0.4)]" 
                   style={{ width: `${maxSteps > 0 ? (progress / maxSteps) * 100 : 0}%` }}
                />
            </div>
            
            {/* Native Slider Opacity 0 but clickable */}
            <input
                type="range"
                min="0"
                max={maxSteps}
                step="0.1"
                value={progress}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={isContinuous}
            />

            {/* Custom Thumb */}
            <div 
               className="absolute h-3.5 w-3.5 bg-cyan-300 rounded-full shadow-[0_0_8px_#44ffff] pointer-events-none transition-transform duration-75 group-hover:scale-125 border border-white/20"
               style={{ left: `${maxSteps > 0 ? (progress / maxSteps) * 100 : 0}%`, transform: 'translateX(-50%)' }}
            />
        </div>
        
        <div className="flex gap-2 mb-4">
          <button
            onClick={togglePlay}
            disabled={isContinuous}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all ${
              isPlaying || isContinuous
                ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30' 
                : 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/30'
            } ${isContinuous ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isPlaying || isContinuous ? <Pause size={16} /> : <Play size={16} />}
            {isContinuous ? 'Looping' : (isPlaying ? 'Pause' : 'Simulate')}
          </button>
          
          <button
            onClick={toggleContinuous}
            className={`px-3 py-2 rounded-lg border transition-all flex items-center justify-center gap-2 ${
               isContinuous 
                 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' 
                 : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
            title="Continuous Flow Mode"
          >
             <Infinity size={16} />
          </button>

          <button
            onClick={onReset}
            disabled={isContinuous}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
            title="Reset Simulation"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-white/70">
            <span>Speed</span>
            <span>{speed.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.25"
            max="8.0"
            step="0.25"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>
      </div>

      {/* Visual Settings */}
      <div className="bg-space-700/50 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
         <div className="flex items-center gap-2 mb-3 text-xs font-mono text-cyan-glow/70 uppercase tracking-widest">
            <Eye size={12} /> Visuals
         </div>
         <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-white/90">Event Horizon</label>
            <button
              onClick={toggleEventHorizon}
              className={`p-1.5 rounded-md transition-colors ${showEventHorizon ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-white/50 hover:text-white'}`}
              title={showEventHorizon ? "Hide Black Hole" : "Show Black Hole"}
            >
              {showEventHorizon ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-white/90">Photon Size</label>
            <span className="font-mono text-sm text-white/70">{photonSize.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.01"
            max="0.3"
            step="0.01"
            value={photonSize}
            onChange={(e) => setPhotonSize(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>
      </div>

      {/* Physics Parameters */}
      <div className="bg-space-700/50 rounded-xl p-4 border border-white/10 backdrop-blur-sm flex flex-col gap-5">
        <div className="text-xs font-mono text-cyan-glow/70 uppercase tracking-widest">Physics</div>

        {/* Modes Grid */}
        <div className="grid grid-cols-1 gap-4">
          {/* Distribution */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-white/90">Source Position</label>
            <div className="flex p-1 bg-space-900/50 rounded-lg border border-white/10">
              {distModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setDistributionMode(mode.id)}
                  disabled={isPlaying || isContinuous}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all disabled:opacity-50
                    ${distributionMode === mode.id
                      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' 
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {mode.icon}
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Impact Mode */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-white/90">Impact Parameter (b)</label>
             <div className="flex p-1 bg-space-900/50 rounded-lg border border-white/10">
              {impactModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setImpactMode(mode.id)}
                  disabled={isPlaying || isContinuous}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all disabled:opacity-50
                    ${impactMode === mode.id
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' 
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {mode.icon}
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mass Parameter */}
        <div className="space-y-3 pt-2 border-t border-white/5">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-white/90">Black Hole Mass (M)</label>
            <span className="font-mono text-sm text-white/70">{mass.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={mass}
            disabled={isPlaying || isContinuous}
            onChange={(e) => setMass(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer disabled:opacity-50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-purple-400 [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>

        {/* Impact Parameter Slider (Only if Fixed) */}
        {impactMode === 'fixed' && (
          <div className="space-y-3 pt-2 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-white/90">Value (b)</label>
              <span className={`font-mono text-sm ${b < bCrit ? 'text-red-400' : 'text-emerald-400'}`}>
                {b.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={minB}
              max={maxB}
              step={0.05 * mass}
              value={b}
              disabled={isPlaying || isContinuous}
              onChange={(e) => setB(parseFloat(e.target.value))}
              className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-50
                ${b < bCrit ? 'bg-red-900/50 [&::-webkit-slider-thumb]:bg-red-500' : 'bg-emerald-900/50 [&::-webkit-slider-thumb]:bg-emerald-500'}
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-colors
              `}
            />
            <div className="flex flex-wrap gap-2">
              {bPresets.map(preset => (
                <PresetButton 
                  key={preset.value} 
                  label={preset.label} 
                  value={preset.value} 
                  onClick={setB} 
                  active={Math.abs(b - preset.value) < 0.1}
                />
              ))}
            </div>
          </div>
        )}
        
        {impactMode === 'random' && (
           <div className="pt-2 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="text-xs text-white/60 bg-white/5 p-3 rounded-lg leading-relaxed">
                 Generating rays with random impact parameters between <span className="font-mono text-white/90">{(2.5*mass).toFixed(1)}</span> and <span className="font-mono text-white/90">{(7.5*mass).toFixed(1)}</span>. This range covers both capture and escape trajectories.
              </div>
           </div>
        )}

        {/* Ray Count */}
        <div className="space-y-3 pt-2 border-t border-white/5">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-white/90">Ray Count</label>
            <span className="font-mono text-sm text-white/70">{rayCount}</span>
          </div>
          <div className="flex gap-3 items-center">
            <input
              type="range"
              min="1"
              max="1000"
              step="1"
              value={rayCount}
              disabled={isPlaying || isContinuous}
              onChange={(e) => setRayCount(parseInt(e.target.value))}
              className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer disabled:opacity-50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:rounded-full"
            />
            <button
              onClick={onRandomize}
              disabled={isPlaying || isContinuous}
              className="p-1.5 bg-white/5 rounded hover:bg-white/10 disabled:opacity-50 transition-colors text-white/70"
              title="Randomize Angles"
            >
              <Shuffle size={14} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Controls;