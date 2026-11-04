import React, { useState, useEffect } from 'react';
import { AdminStats, UserProfile } from '../types';
import { X, ShieldCheck, Users, Zap, AlertTriangle, Settings, RefreshCw, CheckCircle2 } from 'lucide-react';
import { audio } from './AudioEngine';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string | null;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  token,
}) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newTier, setNewTier] = useState<'free' | 'pro' | 'enterprise'>('pro');
  const [extendTrialDays, setExtendTrialDays] = useState(7);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchAdminStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('gahan_jwt_token');
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      } else {
        setNotice(data.error || 'Access denied');
      }
    } catch (err: any) {
      console.error('Error loading admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAdminStats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateUserTier = async () => {
    if (!selectedUser) return;
    audio.playClick();

    try {
      const token = localStorage.getItem('gahan_jwt_token');
      const res = await fetch('/api/admin/users/tier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          tier: newTier,
          extendTrialDays,
        })
      });

      const data = await res.json();
      if (res.ok) {
        audio.playWhoosh();
        setNotice(`User ${selectedUser.email} tier updated to ${newTier.toUpperCase()}`);
        setSelectedUser(null);
        fetchAdminStats();
      } else {
        setNotice(data.error || 'Update failed');
      }
    } catch (err: any) {
      setNotice(err.message || 'Error updating user');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-fade-in overflow-y-auto">
      <div className="glass-panel-glow w-full max-w-6xl h-[88vh] max-h-[900px] rounded-3xl p-6 sm:p-8 border border-cyan-500/40 shadow-2xl relative text-left flex flex-col my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-display text-white">ADMINISTRATIVE CONSOLE</h2>
              <p className="text-xs font-mono text-slate-400">GAHAN AI Freemium Platform Metrics & User Management</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAdminStats}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => {
                audio.playClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {notice && (
          <div className="my-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 text-xs font-mono flex items-center justify-between shrink-0">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Main Body */}
        {stats ? (
          <div className="flex-1 overflow-y-auto space-y-8 pt-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
              <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase">Total Registered Users</div>
                <div className="text-2xl font-bold text-white mt-1">{stats.totalUsers}</div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase">Active Free Trials</div>
                <div className="text-2xl font-bold text-cyan-400 mt-1">{stats.activeTrialUsers}</div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase">Pro / Enterprise</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.proSubscribers + stats.enterpriseAccounts}</div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase">Today API Usage</div>
                <div className="text-2xl font-bold text-indigo-400 mt-1">{stats.todayApiUsage} msgs</div>
              </div>
            </div>

            {/* Model Usage Distribution */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-white/5 space-y-4 font-mono text-xs">
              <h4 className="text-slate-400 uppercase tracking-wider font-bold">MODEL USAGE DISTRIBUTION</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {stats.modelUsage.map((mu, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-900 border border-white/5 flex justify-between items-center">
                    <span className="text-slate-300">{mu.model}</span>
                    <span className="text-cyan-400 font-bold">{mu.count} calls</span>
                  </div>
                ))}
              </div>
            </div>

            {/* User Management Table */}
            <div className="space-y-4">
              <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider font-bold">REGISTERED USER DIRECTORY & SUBSCRIPTION MANAGEMENT</h4>
              <div className="overflow-x-auto rounded-2xl border border-white/10 font-mono text-xs">
                <table className="w-full text-left bg-slate-950">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="p-3">NAME & EMAIL</th>
                      <th className="p-3">ROLE</th>
                      <th className="p-3">TIER</th>
                      <th className="p-3">DAILY USAGE</th>
                      <th className="p-3">TRIAL STATUS</th>
                      <th className="p-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {stats.usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-900/50">
                        <td className="p-3">
                          <div className="font-bold text-white">{u.name}</div>
                          <div className="text-[10px] text-slate-400">{u.email}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'text-slate-400'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            u.tier === 'enterprise' ? 'bg-purple-500/20 text-purple-300' : u.tier === 'pro' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {u.tier}
                          </span>
                        </td>
                        <td className="p-3">{u.dailyUsageCount} / {u.dailyLimit}</td>
                        <td className="p-3">
                          {u.isTrialExpired ? (
                            <span className="text-red-400 font-bold">Expired</span>
                          ) : (
                            <span className="text-emerald-400">{u.trialDaysLeft} days left</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 border border-white/10 text-[11px]"
                          >
                            Edit Tier
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected User Edit Panel */}
            {selectedUser && (
              <div className="p-6 rounded-2xl bg-slate-900 border border-cyan-500/40 space-y-4 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <h4 className="text-white font-bold">MODIFY SUBSCRIPTION: {selectedUser.email}</h4>
                  <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-2">SUBSCRIPTION TIER</label>
                    <select
                      value={newTier}
                      onChange={(e: any) => setNewTier(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white"
                    >
                      <option value="free">FREE TRIAL</option>
                      <option value="pro">GAHAN PRO</option>
                      <option value="enterprise">GAHAN ENTERPRISE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-2">EXTEND TRIAL (DAYS)</label>
                    <input
                      type="number"
                      value={extendTrialDays}
                      onChange={(e) => setExtendTrialDays(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white"
                    />
                  </div>
                </div>

                <button
                  onClick={handleUpdateUserTier}
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400"
                >
                  SAVE USER TIER
                </button>
              </div>
            )}

          </div>
        ) : (
          <div className="py-20 text-center text-slate-400 font-mono text-xs">
            {loading ? 'LOADING ADMINISTRATIVE DATA...' : 'UNAUTHORIZED ACCESS'}
          </div>
        )}

      </div>
    </div>
  );
};
