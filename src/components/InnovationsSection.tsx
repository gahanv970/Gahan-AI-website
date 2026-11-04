import React, { useState } from 'react';
import { ResearchPaper } from '../types';
import { Sliders, Activity, Play, RefreshCw } from 'lucide-react';
import { audio } from './AudioEngine';

export const researchPapersData: ResearchPaper[] = [
  {
    id: 'paper-01',
    title: 'Non-Euclidean Hyper-Graph Attention for 3D Spatial Reasoning',
    codeName: 'GAHAN-RESEARCH-2026-01',
    date: 'OCT 2026',
    readTime: '12 MIN READ',
    abstract: 'We present a non-Euclidean hyper-graph attention mechanism that maps multi-modal spatial tokens into continuous Riemannian manifolds, outperforming standard transformer attention by 42% on complex 3D spatial alignment tasks.',
    metrics: [
      { label: 'Spatial Accuracy', value: '98.7%', change: '+14.2%' },
      { label: 'Memory Footprint', value: '3.4 GB', change: '-35.0%' },
      { label: 'Inference Speed', value: '0.4ms', change: '+210%' }
    ],
    tags: ['3D Spatial AI', 'Hyperbolic Embeddings', 'Transformer Topology'],
    badgeText: 'PUBLISHED RESEARCH 2026'
  },
  {
    id: 'paper-02',
    title: 'Sub-Millisecond Quantum Neural Encryption for Edge Devices',
    codeName: 'GAHAN-RESEARCH-2026-02',
    date: 'SEP 2026',
    readTime: '9 MIN READ',
    abstract: 'Introducing a lattice-based post-quantum cryptographic protocol embedded directly into the neural activation pipeline, guaranteeing zero privacy leakages across untrusted edge compute nodes.',
    metrics: [
      { label: 'Quantum Entropy', value: '256-bit', change: 'MAX' },
      { label: 'Latency Overhead', value: '< 0.05ms', change: 'NEGLIGIBLE' },
      { label: 'Security Grade', value: 'FIPS 140-3', change: 'PASSED' }
    ],
    tags: ['Post-Quantum', 'Neural Security', 'Edge Computing'],
    badgeText: 'SECURITY BENCHMARK 2026'
  }
];

export const InnovationsSection: React.FC = () => {
  const [sparsity, setSparsity] = useState(65);
  const [quantumEntangle, setQuantumEntangle] = useState(85);
  const [isSimulating, setIsSimulating] = useState(false);
  const [tokensProcessed, setTokensProcessed] = useState(1450200);

  const handleTriggerSim = () => {
    audio.playClick();
    audio.playNeuralPulse();
    setIsSimulating(true);
    setTimeout(() => {
      setTokensProcessed(prev => prev + Math.floor(Math.random() * 50000) + 10000);
      setIsSimulating(false);
    }, 800);
  };

  return (
    <section id="research" className="relative z-10 py-32 px-6">
      <div className="max-w-7xl mx-auto space-y-20">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
            GAHAN AI RESEARCH & INNOVATION
          </div>
          <h2 className="text-4xl sm:text-6xl font-bold font-display text-white">
            PIONEERING THE <br />
            <span className="text-gradient-cyan">NEXT AI FRONTIER</span>
          </h2>
          <p className="text-slate-300 font-light text-base sm:text-lg">
            Our engineers publish research innovations and construct interactive simulations that push the boundaries of neural computation and autonomous software.
          </p>
        </div>

        {/* Live Interactive Neural Weight Simulator */}
        <div className="glass-panel p-8 sm:p-12 rounded-3xl relative overflow-hidden border border-cyan-500/30 glow-cyan">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-8 pb-8 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">
                <Sliders className="w-4 h-4" />
                <span>INTERACTIVE PLATFORM SIMULATOR</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold font-display text-white">
                SYNAPTIC WEIGHT MATRIX TUNER
              </h3>
            </div>

            <button
              onClick={handleTriggerSim}
              disabled={isSimulating}
              className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 transition-all flex items-center gap-3 disabled:opacity-50"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-200" />
                  <span>SYNTHESIZING...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>EXECUTE NEURAL PULSE</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Interactive Sliders */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <div className="flex justify-between text-xs font-mono mb-2">
                  <span className="text-slate-400">WEIGHT SPARSITY RATIO</span>
                  <span className="text-cyan-400 font-bold">{sparsity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="95"
                  value={sparsity}
                  onChange={(e) => setSparsity(Number(e.target.value))}
                  className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-2">
                  <span className="text-slate-400">QUANTUM ENTANGLEMENT DEPTH</span>
                  <span className="text-indigo-400 font-bold">{quantumEntangle}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={quantumEntangle}
                  onChange={(e) => setQuantumEntangle(Number(e.target.value))}
                  className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                />
              </div>

              <div className="p-4 bg-slate-950/80 rounded-xl border border-white/5 font-mono text-xs space-y-2 text-slate-300">
                <div className="flex justify-between">
                  <span>COMPUTE COMPLEXITY:</span>
                  <span className="text-cyan-300">O(N log N) Dynamic</span>
                </div>
                <div className="flex justify-between">
                  <span>SYNAPTIC EFFICIENCY:</span>
                  <span className="text-emerald-400">+{(sparsity * 1.4).toFixed(1)}% FLOPS Saved</span>
                </div>
              </div>
            </div>

            {/* Live Simulated Telemetry Display */}
            <div className="lg:col-span-6 bg-slate-950/90 p-6 rounded-2xl border border-cyan-500/20 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400 border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>GAHAN AI STREAM TELEMETRY</span>
                </div>
                <span className="text-cyan-400 font-bold tabular-nums">
                  {tokensProcessed.toLocaleString()} TOKENS
                </span>
              </div>

              <div className="space-y-2 text-slate-300 max-h-40 overflow-hidden font-mono">
                <p className="text-cyan-400">[INIT] GAHAN AI weights aligned at {sparsity}% sparsity.</p>
                <p className="text-slate-400">[QUANTUM] Entanglement factor: {quantumEntangle}%. Vector space normalized.</p>
                <p className="text-indigo-300">[TENSOR] 128 Attention heads broadcasting across 3D node array.</p>
                <p className="text-emerald-400">[STATUS] Zero-loss gradient descent converged in 0.04s.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Research Papers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {researchPapersData.map((paper) => (
            <div
              key={paper.id}
              className="glass-panel p-8 rounded-2xl relative flex flex-col justify-between hover:border-cyan-400/50 transition-all duration-300"
            >
              <div>
                {/* Unboxed Metadata Header */}
                <div className="flex items-center gap-3 text-xs font-mono text-slate-400 mb-4">
                  <span>{paper.codeName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{paper.date}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-cyan-400">{paper.readTime}</span>
                </div>

                <h3 className="text-xl font-bold font-display text-white mb-4 leading-snug">
                  {paper.title}
                </h3>

                <p className="text-slate-300 text-sm font-light leading-relaxed mb-6">
                  {paper.abstract}
                </p>
              </div>

              <div>
                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 p-4 bg-slate-950/80 rounded-xl border border-white/5 mb-6 text-center font-mono">
                  {paper.metrics.map((m, idx) => (
                    <div key={idx}>
                      <div className="text-[10px] text-slate-400 uppercase">{m.label}</div>
                      <div className="text-sm font-bold text-cyan-300 mt-1">{m.value}</div>
                    </div>
                  ))}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 text-xs font-mono text-slate-400">
                  {paper.tags.map((tag, i) => (
                    <span key={i} className="text-slate-400">
                      #{tag}{i < paper.tags.length - 1 ? ' · ' : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
