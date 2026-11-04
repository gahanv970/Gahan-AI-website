import React from 'react';
import { ChevronDown, Sparkles, ArrowRight, Terminal, Shield, Cpu, Zap } from 'lucide-react';
import { audio } from './AudioEngine';

interface HeroSectionProps {
  onOpenChat: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenChat }) => {
  return (
    <section
      id="hero"
      className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between pt-20 sm:pt-24 pb-6 sm:pb-8 px-4 sm:px-6 overflow-hidden"
    >
      <div className="max-w-4xl mx-auto text-center z-10 flex flex-col items-center my-auto w-full">
        
        {/* Category Kicker with Unboxed Metadata */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[10px] sm:text-xs uppercase tracking-widest text-cyan-400 font-mono mb-4 px-3.5 py-1.5 rounded-full bg-slate-900/70 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_20px_rgba(56,189,248,0.15)] max-w-full">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>GAHAN AI PLATFORM</span>
          </div>
          <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>
          <span className="hidden sm:inline">AUTONOMOUS NEURAL MESH</span>
          <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>
          <span className="text-slate-300">SPATIAL COMPUTING</span>
        </div>

        {/* Cinematic High-Impact Responsive Headline */}
        <h1 className="text-[clamp(2.25rem,4.8vw,4.25rem)] font-black tracking-tight font-display uppercase leading-[1.08] mb-4 select-none max-w-3xl w-full">
          <span className="block bg-gradient-to-r from-cyan-300 via-sky-200 to-white bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(56,189,248,0.4)]">
            INTELLIGENCE.
          </span>
          <span className="block bg-gradient-to-r from-slate-100 via-indigo-200 to-cyan-400 bg-clip-text text-transparent">
            BEYOND LIMITS.
          </span>
        </h1>

        {/* Subtitle Prose */}
        <p className="max-w-xl text-xs sm:text-sm md:text-base text-slate-300 font-light leading-relaxed mb-6 text-wrap-balance px-2">
          Engineering next-generation autonomous artificial intelligence, high-performance software systems, enterprise automation, and spatial computing infrastructure.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-6 w-full sm:w-auto px-4">
          <a
            href="#services"
            onClick={() => audio.playClick()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-white bg-slate-900/90 border border-cyan-500/40 hover:border-cyan-300 hover:bg-slate-800 transition-all duration-300 flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(56,189,248,0.25)] hover:shadow-[0_0_35px_rgba(56,189,248,0.5)] group backdrop-blur-xl"
          >
            <span>Explore Platform</span>
            <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
          </a>

          <button
            onClick={() => {
              audio.playClick();
              audio.playWhoosh();
              onOpenChat();
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-cyan-200 bg-gradient-to-r from-cyan-950/80 via-indigo-950/80 to-slate-950/80 border border-cyan-400/50 hover:border-cyan-300 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(56,189,248,0.35)] backdrop-blur-xl group"
          >
            <Sparkles className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
            <span>Consult GAHAN AI</span>
          </button>
        </div>

        {/* Live System Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5 pt-4 border-t border-white/10 w-full max-w-2xl text-left bg-slate-950/60 p-3.5 sm:p-4 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold font-mono text-cyan-300 tabular-nums">99.98%</div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-mono">System Accuracy</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold font-mono text-white tabular-nums">&lt; 0.8ms</div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-mono">Inference Latency</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold font-mono text-cyan-300 tabular-nums">100%</div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-mono">Independent Stack</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold font-mono text-white tabular-nums">Zero-Trust</div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-mono">Quantum Security</div>
            </div>
          </div>
        </div>

      </div>

      {/* Scroll Down Prompt Indicator */}
      <div className="mt-4 flex flex-col items-center gap-1 text-slate-500 text-[10px] font-mono tracking-widest z-10">
        <span>SCROLL TO DISCOVER ARCHITECTURE</span>
        <ChevronDown className="w-3.5 h-3.5 animate-bounce text-cyan-400" />
      </div>
    </section>
  );
};
