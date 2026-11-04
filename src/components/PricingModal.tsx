import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { X, Check, Sparkles, Zap, ShieldCheck, ArrowRight, ShieldAlert } from 'lucide-react';
import { audio } from './AudioEngine';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  token?: string | null;
  onOpenAuth: () => void;
  onUserUpdated?: (user: UserProfile) => void;
  onSubscriptionUpdated?: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  user,
  token,
  onOpenAuth,
  onUserUpdated,
  onSubscriptionUpdated,
}) => {
  const [tiers, setTiers] = useState<any[]>([]);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/subscriptions/pricing')
      .then(res => res.json())
      .then(data => {
        if (data.tiers) setTiers(data.tiers);
      })
      .catch(err => console.error('Error fetching pricing:', err));
  }, []);

  if (!isOpen) return null;

  const handleCheckoutTest = async (tierId: string) => {
    if (!user) {
      onClose();
      onOpenAuth();
      return;
    }

    if (user.tier === tierId) {
      setNotice(`You are already subscribed to ${tierId.toUpperCase()}.`);
      return;
    }

    setLoadingTier(tierId);
    audio.playClick();

    try {
      const res = await fetch('/api/subscriptions/checkout-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gahan_jwt_token')}`
        },
        body: JSON.stringify({ tier: tierId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');

      audio.playWhoosh();
      setNotice(data.message || 'Subscription updated!');
      if (data.user) {
        onUserUpdated?.(data.user);
      }
      onSubscriptionUpdated?.();
    } catch (err: any) {
      setNotice(err.message || 'Subscription error');
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-fade-in overflow-y-auto">
      <div className="glass-panel-glow w-full max-w-5xl p-6 sm:p-10 rounded-3xl border border-cyan-500/40 shadow-2xl relative text-left my-8">
        
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

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>GAHAN AI FREEMIUM SUBSCRIPTION</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-white">
            CHOOSE YOUR INTELLIGENCE TIER
          </h2>
          <p className="text-slate-300 text-sm font-light">
            Unlock higher daily allowances, advanced Gemini models, priority server throughput, and enterprise automation.
          </p>
        </div>

        {notice && (
          <div className="mb-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 text-xs font-mono text-center flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" />
            <span>{notice}</span>
          </div>
        )}

        {/* Tier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {tiers.map((t) => {
            const isCurrent = user?.tier === t.id;
            const isPro = t.id === 'pro';

            return (
              <div
                key={t.id}
                className={`glass-panel p-6 sm:p-8 rounded-2xl flex flex-col justify-between relative border transition-all ${
                  isPro ? 'border-cyan-400/80 shadow-[0_0_30px_rgba(56,189,248,0.2)] bg-slate-900/90' : 'border-white/10 hover:border-white/20'
                }`}
              >
                {t.badge && (
                  <span className={`absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${
                    isPro ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50' : 'bg-slate-800 text-slate-300 border-white/10'
                  }`}>
                    {t.badge}
                  </span>
                )}

                <div>
                  <h3 className="text-xl font-bold font-display text-white mb-2">{t.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl sm:text-4xl font-black font-mono text-white">{t.price}</span>
                    <span className="text-xs font-mono text-slate-400">/ {t.period}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5 text-xs font-mono mb-6 text-slate-300">
                    <div>ALLOWANCE: <span className="text-cyan-300 font-bold">{t.dailyLimit ? `${t.dailyLimit} msgs/day` : `${t.monthlyLimit} msgs/mo`}</span></div>
                  </div>

                  <ul className="space-y-3 mb-8 text-xs font-sans text-slate-300">
                    {t.features.map((feat: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleCheckoutTest(t.id)}
                  disabled={loadingTier === t.id}
                  className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                      : isPro
                      ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                      : 'bg-slate-900 border border-white/10 hover:border-cyan-400 text-slate-200'
                  }`}
                >
                  {isCurrent ? (
                    <span>ACTIVE TIER</span>
                  ) : (
                    <>
                      <span>{user ? `UPGRADE TO ${t.name}` : 'LOG IN TO SUBSCRIBE'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Security & Test Mode Notice */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Server-Verified Checkout Protocol (Test Mode Active). Live card processing disabled.</span>
          </div>
          <div className="text-slate-500">GAHAN AI FREEMIUM v4.0</div>
        </div>

      </div>
    </div>
  );
};
