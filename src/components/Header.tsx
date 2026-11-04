import React from 'react';
import { UserProfile } from '../types';
import { Sparkles, Volume2, VolumeX, User, ShieldCheck, Zap, LogOut } from 'lucide-react';
import { audio } from './AudioEngine';

interface HeaderProps {
  onOpenChat: () => void;
  isAudioMuted: boolean;
  onToggleAudio: () => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onOpenPricing: () => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenChat,
  isAudioMuted,
  onToggleAudio,
  user,
  onOpenAuth,
  onOpenPricing,
  onOpenAdmin,
  onLogout,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#030712]/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3.5 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#"
          className="flex items-center gap-3 text-lg font-bold tracking-wider text-white hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 font-display group"
          onClick={() => audio.playClick()}
        >
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-[0_0_18px_rgba(56,189,248,0.5)] group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a9 9 0 1 0 9 9h-7.5" />
            </svg>
            <div className="absolute inset-0 rounded-xl border border-cyan-300/40 opacity-50" />
          </div>
          <span>GAHAN<span className="text-cyan-400 font-light ml-1">AI</span></span>
        </a>

        {/* Zone 2: Nav Links */}
        <nav className="hidden lg:flex items-center gap-8 text-xs uppercase tracking-widest font-medium text-slate-400">
          <a href="#hero" className="hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0">Platform</a>
          <a href="#architecture" className="hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0">Architecture</a>
          <a href="#services" className="hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0">Capabilities</a>
          <button onClick={() => { audio.playClick(); onOpenPricing(); }} className="hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0">Pricing</button>
          <a href="#contact" className="hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0">Connect</a>
        </nav>

        {/* Zone 3: Auth Profile / Tier Badge / Consult Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          
          {user ? (
            <div className="flex items-center gap-2">
              {/* User Profile Pill */}
              <div className="flex items-center gap-2 p-1.5 pl-3 rounded-xl bg-slate-900/90 border border-white/10 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-white font-bold max-w-[100px] truncate hidden sm:inline">{user.name}</span>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                  user.tier === 'enterprise'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : user.tier === 'pro'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-800 text-slate-300 border border-white/10'
                }`}>
                  {user.tier === 'free' ? `${Math.max(0, user.dailyLimit - user.dailyUsageCount)}/20 Msgs` : user.tier}
                </span>

                {user.role === 'admin' && (
                  <button
                    onClick={() => { audio.playClick(); onOpenAdmin(); }}
                    title="Open Platform Owner Admin Portal"
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/30 text-purple-300 border border-purple-400/60 hover:bg-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.4)]"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
                    <span>ADMIN PORTAL</span>
                  </button>
                )}

                <button
                  onClick={() => { audio.playClick(); onLogout(); }}
                  title="Logout"
                  className="p-1 text-slate-500 hover:text-red-400"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { audio.playClick(); onOpenAuth(); }}
              className="px-4 py-2 rounded-xl text-xs font-mono text-cyan-300 bg-slate-900 border border-cyan-500/30 hover:border-cyan-400 transition-all whitespace-nowrap"
            >
              LOG IN / TRIAL
            </button>
          )}

          <button
            onClick={() => {
              audio.playClick();
              onToggleAudio();
            }}
            aria-label={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors hidden sm:block"
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />}
          </button>

          <button
            onClick={() => {
              audio.playClick();
              audio.playWhoosh();
              onOpenChat();
            }}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 transition-all duration-300 shadow-[0_0_20px_rgba(56,189,248,0.35)] whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Consult GAHAN AI</span>
            <span className="sm:hidden">Consult</span>
          </button>

        </div>

      </div>
    </header>
  );
};
