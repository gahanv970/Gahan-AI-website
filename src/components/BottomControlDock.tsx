import React, { useState } from 'react';
import { SceneSettings } from '../types';
import { Eye, Layers, Maximize2, RotateCw, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import { audio } from './AudioEngine';

interface BottomControlDockProps {
  settings: SceneSettings;
  onUpdateSettings: (newSettings: Partial<SceneSettings>) => void;
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 w-[92vw] max-w-[680px] transition-all duration-500">
      
      {/* Collapse / Expand Toggle Handle attached to top center of dock */}
      <div className="flex justify-center -mb-2 relative z-10">
        <button
          onClick={() => {
            audio.playClick();
            setCollapsed(!collapsed);
          }}
          className="px-4 py-1 rounded-t-xl bg-slate-950/90 border-t border-x border-cyan-500/30 text-[10px] font-mono uppercase text-slate-300 hover:text-cyan-300 hover:border-cyan-400 transition-all shadow-[0_-5px_15px_rgba(0,0,0,0.5)] flex items-center gap-1.5 backdrop-blur-2xl"
        >
          {collapsed ? (
            <>
              <ChevronUp className="w-3 h-3 text-cyan-400" />
              <span>SHOW 3D CONTROLS</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 text-slate-400" />
              <span>HIDE DOCK</span>
            </>
          )}
        </button>
      </div>

      {/* Main Glassmorphic Compact Dock Container */}
      {!collapsed && (
        <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-950/85 border border-cyan-500/30 shadow-[0_8px_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex flex-wrap items-center justify-center sm:justify-between gap-2.5 sm:gap-3 text-[11px] font-mono">
          
          {/* Dock Badge Indicator */}
          <div className="flex items-center gap-1.5 text-cyan-400 border-r border-white/10 pr-3 hidden md:flex shrink-0">
            <Sparkles className="w-3 h-3" />
            <span className="font-bold tracking-widest text-[9px]">3D RIG</span>
          </div>

          {/* Core Rotation Speed Slider */}
          <div className="flex items-center gap-2 shrink-0">
            <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 hidden sm:inline text-[10px]">SPEED:</span>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={settings.coreRotationSpeed}
              onChange={(e) => onUpdateSettings({ coreRotationSpeed: Number(e.target.value) })}
              className="w-16 sm:w-20 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-cyan-300 w-7 tabular-nums text-[10px]">{settings.coreRotationSpeed}x</span>
          </div>

          {/* Exploded View Ratio Slider */}
          <div className="flex items-center gap-2 shrink-0">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400 hidden sm:inline text-[10px]">EXPLODE:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.explodedViewRatio}
              onChange={(e) => onUpdateSettings({ explodedViewRatio: Number(e.target.value) })}
              className="w-16 sm:w-20 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
            <span className="text-indigo-300 w-8 tabular-nums text-[10px]">{(settings.explodedViewRatio * 100).toFixed(0)}%</span>
          </div>

          {/* Wireframe Mode Toggle */}
          <button
            onClick={() => {
              audio.playClick();
              onUpdateSettings({ wireframeMode: !settings.wireframeMode });
            }}
            className={`px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 shrink-0 text-[10px] ${
              settings.wireframeMode
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>WIREFRAME</span>
          </button>

          {/* Cinema Mode Toggle */}
          <button
            onClick={() => {
              audio.playClick();
              onUpdateSettings({ zenMode: !settings.zenMode });
            }}
            className={`px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 shrink-0 text-[10px] ${
              settings.zenMode
                ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
            }`}
          >
            <Maximize2 className="w-3 h-3" />
            <span>CINEMA</span>
          </button>

        </div>
      )}

    </div>
  );
};
