import React, { useState } from 'react';
import { Send, CheckCircle2, Sparkles, MessageSquare } from 'lucide-react';
import { audio } from './AudioEngine';

interface ContactSectionProps {
  onOpenChatWithPrompt: (prompt: string) => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ onOpenChatWithPrompt }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    serviceInterest: 'Artificial Intelligence',
    projectScope: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [terminalLog, setTerminalLog] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    audio.playClick();
    audio.playWhoosh();

    setTerminalLog([
      '[INIT] Encrypting project specification payload...',
      `[USER] ${formData.name} <${formData.email}>`,
      `[TARGET] Service Domain: ${formData.serviceInterest}`,
      '[SECURITY] Verifying post-quantum zero-knowledge handshake...',
      '[SUCCESS] Inquiry transmitted to GAHAN AI Technology Team. Response ETA: < 2 Hours.'
    ]);
    setSubmitted(true);
  };

  return (
    <section id="contact" className="relative z-10 py-32 px-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
            CHAPTER 06 · INITIATE COLLABORATION
          </div>
          <h2 className="text-4xl sm:text-6xl font-bold font-display text-white">
            CONNECT WITH <br />
            <span className="text-gradient-cyan">GAHAN AI</span>
          </h2>
          <p className="text-slate-300 font-light text-base sm:text-lg">
            Ready to build next-generation intelligent applications? Submit your specification or query our GAHAN AI assistant instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Form Side */}
          <div className="lg:col-span-7 glass-panel-glow p-8 sm:p-12 rounded-3xl border border-cyan-500/30 shadow-2xl">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-6 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-2">FULL NAME</label>
                    <input
                      type="text"
                      required
                      placeholder="Dr. Elena Vance"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 text-sm font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-2">CORPORATE EMAIL</label>
                    <input
                      type="email"
                      required
                      placeholder="elena@tech-corp.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 text-sm font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-2">ORGANIZATION</label>
                    <input
                      type="text"
                      placeholder="Quantum Innovations Inc."
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 text-sm font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-2">PRIMARY INTEREST</label>
                    <select
                      value={formData.serviceInterest}
                      onChange={(e) => setFormData({ ...formData, serviceInterest: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-white focus:outline-none focus:border-cyan-400 text-sm font-sans"
                    >
                      <option value="Artificial Intelligence">Artificial Intelligence</option>
                      <option value="Machine Learning">Machine Learning</option>
                      <option value="Spatial Web Development">Spatial Web Development</option>
                      <option value="Enterprise Automation">Enterprise Automation</option>
                      <option value="Cloud AI Infrastructure">Cloud AI Infrastructure</option>
                      <option value="Quantum Cybersecurity">Quantum Cybersecurity</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-2">PROJECT BRIEF & REQUIREMENTS</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your project vision, target metrics, or software requirements..."
                    value={formData.projectScope}
                    onChange={(e) => setFormData({ ...formData, projectScope: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 text-sm font-sans"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl text-xs font-bold uppercase tracking-widest text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 transition-all flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(56,189,248,0.4)]"
                >
                  <Send className="w-4 h-4" />
                  <span>TRANSMIT SPECIFICATION PAYLOAD</span>
                </button>
              </form>
            ) : (
              <div className="space-y-6 text-left">
                <div className="flex items-center gap-3 text-cyan-400">
                  <CheckCircle2 className="w-8 h-8" />
                  <h3 className="text-2xl font-bold font-display text-white">PAYLOAD TRANSMITTED</h3>
                </div>

                {/* Terminal Feedback */}
                <div className="bg-slate-950/90 p-6 rounded-2xl border border-cyan-500/30 font-mono text-xs space-y-2 text-slate-300">
                  {terminalLog.map((log, i) => (
                    <p key={i} className={i === terminalLog.length - 1 ? 'text-cyan-400 font-bold' : ''}>
                      {log}
                    </p>
                  ))}
                </div>

                <button
                  onClick={() => {
                    audio.playClick();
                    setSubmitted(false);
                  }}
                  className="px-6 py-3 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono uppercase text-slate-300 hover:text-white hover:border-cyan-400 transition-colors"
                >
                  RESET FORM
                </button>
              </div>
            )}
          </div>

          {/* AI Direct Query Side */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Sparkles className="w-6 h-6" />
              </div>

              <h3 className="text-2xl font-bold font-display text-white">
                INSTANT CONSULTATION WITH GAHAN AI
              </h3>

              <p className="text-slate-400 text-sm font-light leading-relaxed">
                Need immediate answers regarding intelligent software architecture, automation models, or integration timelines? Ask GAHAN AI directly.
              </p>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    audio.playClick();
                    onOpenChatWithPrompt("What is GAHAN AI's approach to autonomous enterprise software?");
                  }}
                  className="w-full text-left p-3.5 rounded-xl bg-slate-950/80 border border-white/5 hover:border-cyan-400/50 text-xs font-mono text-slate-300 hover:text-cyan-300 transition-all flex items-center justify-between group"
                >
                  <span>"What is GAHAN AI's approach to software?"</span>
                  <MessageSquare className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
                </button>

                <button
                  onClick={() => {
                    audio.playClick();
                    onOpenChatWithPrompt("How does GAHAN AI implement zero-trust security and data privacy?");
                  }}
                  className="w-full text-left p-3.5 rounded-xl bg-slate-950/80 border border-white/5 hover:border-cyan-400/50 text-xs font-mono text-slate-300 hover:text-cyan-300 transition-all flex items-center justify-between group"
                >
                  <span>"How do you implement data privacy?"</span>
                  <MessageSquare className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
                </button>

                <button
                  onClick={() => {
                    audio.playClick();
                    onOpenChatWithPrompt("Can you explain GAHAN AI's 3D Spatial WebGL platform?");
                  }}
                  className="w-full text-left p-3.5 rounded-xl bg-slate-950/80 border border-white/5 hover:border-cyan-400/50 text-xs font-mono text-slate-300 hover:text-cyan-300 transition-all flex items-center justify-between group"
                >
                  <span>"Explain GAHAN AI's 3D Spatial WebGL platform"</span>
                  <MessageSquare className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
