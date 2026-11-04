import React from 'react';
import { ArrowUp } from 'lucide-react';
import { audio } from './AudioEngine';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    audio.playClick();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative z-10 border-t border-white/10 bg-[#030712] py-16 px-6 text-slate-400 font-sans text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Brand */}
        <div className="flex items-center gap-3 font-display text-white text-base font-bold">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.4)]">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a9 9 0 1 0 9 9h-7.5" />
            </svg>
          </div>
          <span>GAHAN<span className="text-cyan-400 font-light ml-1">AI</span></span>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-8 font-mono text-xs uppercase tracking-widest text-slate-400">
          <a href="#hero" className="hover:text-cyan-400 transition-colors">Platform</a>
          <a href="#architecture" className="hover:text-cyan-400 transition-colors">Architecture</a>
          <a href="#services" className="hover:text-cyan-400 transition-colors">Capabilities</a>
          <a href="#research" className="hover:text-cyan-400 transition-colors">Innovations</a>
          <a href="#contact" className="hover:text-cyan-400 transition-colors">Connect</a>
        </div>

        {/* Copyright & Scroll Top */}
        <div className="flex items-center gap-6 font-mono text-slate-500 text-xs">
          <span>© 2026 GAHAN AI PLATFORM. ALL RIGHTS RESERVED.</span>

          <button
            onClick={scrollToTop}
            aria-label="Scroll to top of page"
            className="p-2.5 rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>

      </div>
    </footer>
  );
};
