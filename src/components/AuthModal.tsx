import React, { useState } from 'react';
import { UserProfile } from '../types';
import { X, Lock, Mail, User, Sparkles, ArrowRight } from 'lucide-react';
import { audio } from './AudioEngine';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (token: string, user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    audio.playClick();

    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const payload = mode === 'register' ? { name, email, password } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      audio.playWhoosh();
      onAuthSuccess(data.token, data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-fade-in">
      <div className="glass-panel-glow w-full max-w-md p-8 rounded-3xl border border-cyan-500/40 shadow-2xl relative text-left">
        
        {/* Close Button */}
        <button
          onClick={() => {
            audio.playClick();
            onClose();
          }}
          className="absolute top-6 right-6 p-2 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.4)]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-display text-white">
              {mode === 'register' ? 'CREATE GAHAN ACCOUNT' : 'GAHAN AI LOGIN'}
            </h3>
            <p className="text-xs font-mono text-slate-400">
              {mode === 'register' ? '7-Day Free Trial Included' : 'Enter your credentials'}
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex rounded-xl bg-slate-950 p-1 mb-6 border border-white/10 text-xs font-mono">
          <button
            onClick={() => {
              audio.playClick();
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'login' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            LOG IN
          </button>
          <button
            onClick={() => {
              audio.playClick();
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'register' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            REGISTER (FREE TRIAL)
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">FULL NAME</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="Dr. Elena Vance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">EMAIL ADDRESS</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                placeholder="elena@gahan.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">PASSWORD</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(56,189,248,0.4)]"
          >
            {loading ? 'AUTHENTICATING...' : mode === 'register' ? 'START 7-DAY FREE TRIAL' : 'AUTHENTICATE & ENTER'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
