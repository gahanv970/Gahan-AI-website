import React from 'react';
import { UserProfile } from '../types';
import { X, Sparkles, ShieldAlert, ArrowRight, Check } from 'lucide-react';
import { audio } from './AudioEngine';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: 'trial_expired' | 'daily_limit' | 'model_locked' | null;
  onOpenPricing: () => void;
  user?: UserProfile | null;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  reason,
  onOpenPricing,
  user,
}) => {
  if (!isOpen) return null;

  const getTitle = () => {
    switch (reason) {
      case 'trial_expired': return 'FREE TRIAL EXPIRED';
      case 'daily_limit': return 'DAILY ALLOWANCE REACHED';
      case 'model_locked': return 'PRO MODEL ACCESS RESTRICTED';
      default: return 'UPGRADE TO GAHAN PRO';
    }
  };

  const getDesc = () => {
    switch (reason) {
      case 'trial_expired':
        return 'Your 7-day GAHAN AI Free Trial has expired. Upgrade to GAHAN PRO to continue unlimited strategic consultations.';
      case 'daily_limit':
        return 'You have used all 20 free messages for today. Upgrade to GAHAN PRO for 1,000 monthly messages or wait until tomorrow.';
      case 'model_locked':
        return 'This advanced Gemini model requires a GAHAN PRO or ENTERPRISE subscription. Upgrade now for full model access.';
      default:
        return 'Unlock higher allowances, advanced models, and priority processing.';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-fade-in">
      <div className="glass-panel-glow w-full max-w-md p-8 rounded-3xl border border-cyan-500/40 shadow-2xl relative text-left">
        
        <button
          onClick={() => {
            audio.playClick();
            onClose();
          }}
          className="absolute top-6 right-6 p-2 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 mb-6 shadow-[0_0_20px_rgba(56,189,248,0.4)]">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-bold font-display text-white mb-2">{getTitle()}</h3>
        <p className="text-slate-300 text-xs font-light leading-relaxed mb-6">{getDesc()}</p>

        <div className="space-y-2 mb-8 p-4 rounded-2xl bg-slate-950/80 border border-white/5 text-xs font-sans text-slate-300">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-cyan-400" />
            <span>1,000 Monthly Consultation Messages</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-cyan-400" />
            <span>Access to Gemini 3.6 & 3.8 Advanced Models</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-cyan-400" />
            <span>Priority Real-Time Inference Stream</span>
          </div>
        </div>

        <button
          onClick={() => {
            audio.playClick();
            audio.playWhoosh();
            onClose();
            onOpenPricing();
          }}
          className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(56,189,248,0.4)]"
        >
          <span>VIEW SUBSCRIPTION TIERS</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
};
