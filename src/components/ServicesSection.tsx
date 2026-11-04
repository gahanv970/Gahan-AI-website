import React, { useState } from 'react';
import { ServiceItem } from '../types';
import { Cpu, BrainCircuit, Code, Workflow, Cloud, ShieldCheck, X, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { audio } from './AudioEngine';

interface ServicesSectionProps {
  activeServiceId: string | null;
  onSelectService: (id: string | null) => void;
  onOpenChatWithPrompt: (prompt: string) => void;
}

export const servicesData: ServiceItem[] = [
  {
    id: 'ai',
    title: 'Artificial Intelligence',
    subtitle: 'Autonomous Multimodal Cognition',
    category: 'DEEP LEARNING',
    description: 'Custom fine-tuned generative models, vision transformers, dynamic agentic workflows, and reasoning engines built for mission-critical enterprise scale.',
    iconName: 'Cpu',
    color: '#38bdf8',
    capabilities: [
      'Custom LLM Pre-training & Fine-tuning',
      'Multimodal Vision & Audio Perception',
      'Autonomous Tool-Use & Agentic Frameworks',
      'Reinforcement Learning from Human Feedback (RLHF)'
    ],
    specs: [
      { label: 'Inference Throughput', value: '14,000 Tokens/sec' },
      { label: 'Context Horizon', value: '2M Tokens' },
      { label: 'Architecture', value: 'MoE (Mixture of Experts)' }
    ],
    threeDType: 'ai-sphere'
  },
  {
    id: 'ml',
    title: 'Machine Learning',
    subtitle: 'Predictive Neural Pipelines',
    category: 'DATA SCIENCE',
    description: 'Ultra-low latency predictive engines, time-series anomaly detection, and automated MLOps pipelines designed for continuous high-throughput data streams.',
    iconName: 'BrainCircuit',
    color: '#a855f7',
    capabilities: [
      'Real-time Streaming Anomaly Detection',
      'Distributed Model Training & Distillation',
      'Automated Hyperparameter Optimization',
      'Edge Inference Optimization (ONNX / TensorRT)'
    ],
    specs: [
      { label: 'Model Latency', value: '< 0.8ms' },
      { label: 'Feature Matrix', value: '50,000 Dimensions' },
      { label: 'Training Pipeline', value: 'Kubeflow & Ray Core' }
    ],
    threeDType: 'ml-matrix'
  },
  {
    id: 'web',
    title: 'Spatial Web Development',
    subtitle: 'Next-Gen 3D & WebGL Systems',
    category: 'FULL-STACK SPATIAL',
    description: 'High-performance 3D spatial web applications, custom WebGL/WebGPU shaders, React architectures, and immersive interactive digital experiences.',
    iconName: 'Code',
    color: '#34d399',
    capabilities: [
      'Custom Three.js / WebGL / WebGPU Shaders',
      'Full-Stack Next.js & React 19 Architecture',
      'Zero-Latency Dynamic UI & Canvas Interfaces',
      'Progressive Web Apps with Offline Resilience'
    ],
    specs: [
      { label: 'FPS Performance', value: '60 - 120 FPS Lossless' },
      { label: 'Bundle Footprint', value: '< 150 KB Core' },
      { label: 'Rendering Pipeline', value: 'PBR & Custom GLSL' }
    ],
    threeDType: 'web-prism'
  },
  {
    id: 'automation',
    title: 'Enterprise Automation',
    subtitle: 'Autonomous Agent Orchestration',
    category: 'INTELLIGENT WORKFLOW',
    description: 'Self-healing workflow pipelines, autonomous agent swarms, API integration bridges, and robotic process automation with cognitive decision-making.',
    iconName: 'Workflow',
    color: '#f59e0b',
    capabilities: [
      'Multi-Agent Swarm Orchestration',
      'Self-Healing Event-Driven Architecture',
      'Natural Language Workflow Generation',
      'Enterprise API & Workspace Integration'
    ],
    specs: [
      { label: 'Task Throughput', value: '1M Actions / Day' },
      { label: 'Failure Recovery', value: '99.999% Autonomous' },
      { label: 'Integration Protocols', value: 'gRPC / GraphQL / REST' }
    ],
    threeDType: 'automation-rings'
  },
  {
    id: 'cloud',
    title: 'Cloud AI Infrastructure',
    subtitle: 'High-Performance Distributed Compute',
    category: 'INFRASTRUCTURE',
    description: 'Serverless GPU cluster management, distributed model training environments, auto-scaling inference endpoints, and Kubernetes cloud architectures.',
    iconName: 'Cloud',
    color: '#60a5fa',
    capabilities: [
      'Serverless GPU Cluster Orchestration',
      'Multi-Cloud Failover & Edge Caching',
      'Zero-Trust Container Security & Isolation',
      'Cost-Optimized Scale-to-Zero Deployment'
    ],
    specs: [
      { label: 'Uptime Guarantee', value: '99.999% SLA' },
      { label: 'Scale Latency', value: '< 2.5 seconds' },
      { label: 'Compute Providers', value: 'GCP / AWS / Private GPU' }
    ],
    threeDType: 'cloud-nodes'
  },
  {
    id: 'cyber',
    title: 'Quantum Cybersecurity',
    subtitle: 'Post-Quantum Neural Defense',
    category: 'SECURITY & CRYPTOGRAPHY',
    description: 'AI-driven threat mitigation, post-quantum cryptographic encryption, real-time zero-day exploit prevention, and zero-trust identity verification.',
    iconName: 'ShieldCheck',
    color: '#ef4444',
    capabilities: [
      'Post-Quantum Lattice Cryptography',
      'Real-Time Neural Threat Detection',
      'Automated Zero-Day Vulnerability Patching',
      'Zero-Trust Hardware Enclave Security'
    ],
    specs: [
      { label: 'Encryption Standard', value: 'NIST PQ-Kyber 1024' },
      { label: 'Threat Mitigation', value: '< 0.001s Instant' },
      { label: 'Compliance Standards', value: 'ISO 27001 / SOC 2 Type II' }
    ],
    threeDType: 'cyber-shield'
  }
];

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  activeServiceId,
  onSelectService,
  onOpenChatWithPrompt,
}) => {
  const [selectedDetail, setSelectedDetail] = useState<ServiceItem | null>(null);

  const getIcon = (name: string) => {
    switch (name) {
      case 'Cpu': return Cpu;
      case 'BrainCircuit': return BrainCircuit;
      case 'Code': return Code;
      case 'Workflow': return Workflow;
      case 'Cloud': return Cloud;
      case 'ShieldCheck': return ShieldCheck;
      default: return Cpu;
    }
  };

  return (
    <section id="services" className="relative z-10 py-32 px-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
            3D INTERACTIVE MATRIX · SELECT TO INSPECT
          </div>
          <h2 className="text-4xl sm:text-6xl font-bold font-display text-white">
            ADVANCED AI & <br />
            <span className="text-gradient-cyan">ENGINEERING SERVICES</span>
          </h2>
          <p className="text-slate-300 font-light text-base sm:text-lg">
            Interact with floating neural nodes in the 3D scene or select a service module below to explore technical specifications and deployment capabilities.
          </p>
        </div>

        {/* 3D Interactive Floating Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {servicesData.map((item) => {
            const Icon = getIcon(item.iconName);
            const isHovered = activeServiceId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => {
                  audio.playClick();
                  audio.playWhoosh();
                  setSelectedDetail(item);
                }}
                onMouseEnter={() => {
                  audio.playHover();
                  onSelectService(item.id);
                }}
                onMouseLeave={() => onSelectService(null)}
                className={`glass-panel p-8 rounded-2xl cursor-pointer transition-all duration-500 relative group overflow-hidden ${
                  isHovered ? 'border-cyan-400/80 -translate-y-2 glow-cyan' : 'hover:border-white/20'
                }`}
              >
                {/* Accent Background Glow */}
                <div
                  className="absolute -right-12 -top-12 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-60 transition-opacity"
                  style={{ backgroundColor: item.color }}
                />

                {/* Category & Icon */}
                <div className="flex items-center justify-between mb-8">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 border-b border-white/10 pb-1">
                    {item.category}
                  </span>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{
                      backgroundColor: `${item.color}15`,
                      border: `1px solid ${item.color}40`,
                      color: item.color,
                    }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                </div>

                {/* Title & Subtitle */}
                <h3 className="text-2xl font-bold font-display text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  {item.title}
                </h3>
                <div className="text-xs font-mono text-cyan-400 mb-4">{item.subtitle}</div>

                {/* Short Description */}
                <p className="text-slate-400 text-sm font-light leading-relaxed mb-6">
                  {item.description}
                </p>

                {/* Action CTA */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-slate-300 group-hover:text-white transition-colors">
                  <span>INSPECT SPECIFICATIONS</span>
                  <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* DETAILED MODAL VIEWER */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-2xl animate-fade-in">
          <div className="glass-panel-glow w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-10 relative text-left shadow-2xl border border-cyan-500/40">
            
            {/* Close Button */}
            <button
              onClick={() => {
                audio.playClick();
                setSelectedDetail(null);
              }}
              className="absolute top-6 right-6 p-3 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:border-cyan-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                  backgroundColor: `${selectedDetail.color}20`,
                  border: `1px solid ${selectedDetail.color}60`,
                  color: selectedDetail.color,
                }}
              >
                {React.createElement(getIcon(selectedDetail.iconName), { className: 'w-7 h-7' })}
              </div>
              <div>
                <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">{selectedDetail.category}</div>
                <h2 className="text-3xl font-bold font-display text-white">{selectedDetail.title}</h2>
              </div>
            </div>

            <p className="text-slate-300 text-base font-light leading-relaxed mb-8 border-b border-white/10 pb-6">
              {selectedDetail.description}
            </p>

            {/* Technical Specs Grid */}
            <div className="mb-8">
              <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-4">TECHNICAL BENCHMARKS & SPECS</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {selectedDetail.specs.map((spec, i) => (
                  <div key={i} className="bg-slate-950/80 p-4 rounded-xl border border-white/5">
                    <div className="text-xs font-mono text-slate-400">{spec.label}</div>
                    <div className="text-lg font-bold font-mono text-cyan-300 mt-1">{spec.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Core Capabilities Checklist */}
            <div className="mb-10">
              <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-4">ENTERPRISE CAPABILITIES</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedDetail.capabilities.map((cap, i) => (
                  <div key={i} className="flex items-start gap-3 bg-slate-900/40 p-3 rounded-lg border border-white/5">
                    <CheckCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-200 font-light">{cap}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Action CTA */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  audio.playClick();
                  const prompt = `Tell me more about GAHAN AI's ${selectedDetail.title} service and how we can integrate it into our technology platform.`;
                  setSelectedDetail(null);
                  onOpenChatWithPrompt(prompt);
                }}
                className="flex-1 px-6 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(56,189,248,0.4)]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Consult GAHAN AI Regarding {selectedDetail.title}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </section>
  );
};
