import React from 'react';
import { Cpu, Zap, Network, ShieldCheck, Database, Layers, ArrowUpRight } from 'lucide-react';
import { audio } from './AudioEngine';

export const StorySection: React.FC = () => {
  const pillars = [
    {
      icon: Cpu,
      title: 'Autonomous Systems',
      desc: 'Real-time multi-modal contextual understanding powered by high-dimensional vision transformers and spatial neural arrays.',
      code: 'GAHAN // SYSTEMS',
    },
    {
      icon: Network,
      title: 'Neural Software Architecture',
      desc: 'Self-optimizing latent representation structures that synthesize code, reasoning paths, and creative assets with sub-millisecond precision.',
      code: 'GAHAN // SYNTHESIS',
    },
    {
      icon: Database,
      title: 'High-Performance Computing',
      desc: 'Billion-scale similarity retrieval matrix providing instant contextual grounding across hyper-dimensional memory networks.',
      code: 'GAHAN // COMPUTE',
    },
    {
      icon: ShieldCheck,
      title: 'Enterprise Automation',
      desc: 'Formally verified cryptographic security layers ensuring strict mathematical compliance, privacy isolation, and workflow execution.',
      code: 'GAHAN // AUTOMATION',
    },
  ];

  return (
    <div id="architecture" className="relative z-10 py-24 px-6 space-y-32">
      
      {/* SECTION 2: ARCHITECTURE */}
      <section className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-widest">
              <Layers className="w-4 h-4" />
              <span>ABOUT GAHAN AI</span>
              <span className="text-slate-600">·</span>
              <span>PLATFORM ARCHITECTURE</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-bold font-display tracking-tight text-white leading-tight">
              INDEPENDENT <br />
              <span className="text-gradient-cyan">INTELLIGENCE PLATFORM</span>
            </h2>

            <p className="text-slate-300 font-light leading-relaxed text-base sm:text-lg">
              GAHAN AI is built from first principles as an independent technology platform. By engineering modular neural components and spatial computing models, GAHAN AI delivers unmatched precision, zero-latency inference, and robust software automation.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 font-mono text-xs text-slate-400">
              <div>
                <span className="text-white font-bold block text-sm">System Capacity</span>
                <span>Distributed Neural Mesh</span>
              </div>
              <div>
                <span className="text-white font-bold block text-sm">Parallel Topology</span>
                <span>3D Tensor Pipeline</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 glass-panel p-8 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
              <Zap className="w-24 h-24 text-cyan-400" />
            </div>
            <div className="text-xs font-mono text-cyan-400 mb-4">GAHAN AI SYSTEM TELEMETRY</div>
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">CORE ARCHITECTURE</span>
                <span className="text-cyan-300">GAHAN-Neural-v4</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">ATTENTION HEADS</span>
                <span className="text-white">128 Multi-Head</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">QUANTIZATION</span>
                <span className="text-white">INT4 Dynamic Precision</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">CONTEXT HORIZON</span>
                <span className="text-cyan-400 font-bold">2,000,000 Tokens</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: CORE PILLARS */}
      <section className="max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="text-xs font-mono text-indigo-400 uppercase tracking-widest">CHAPTER 02 · CORE PILLARS</div>
          <h2 className="text-3xl sm:text-5xl font-bold font-display text-white">THE FOUR PILLARS OF GAHAN AI</h2>
          <p className="text-slate-400 font-light text-base">Architected for absolute performance, privacy, and continuous software evolution.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pillars.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="glass-panel p-8 rounded-2xl hover:border-cyan-500/50 transition-all duration-300 group relative"
                onMouseEnter={() => audio.playHover()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono text-slate-500">{item.code}</span>
                </div>
                <h3 className="text-xl font-bold font-display text-white mb-3 group-hover:text-cyan-300 transition-colors">
                  {item.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed font-light">
                  {item.desc}
                </p>
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>SYSTEM MATRIX</span>
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
};
