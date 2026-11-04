import React, { useState, useEffect } from 'react';
import { AdminStats, UserProfile, ModelConfigRecord, AuditLogRecord } from '../types';
import {
  X, ShieldCheck, Users, Zap, AlertTriangle, Settings, RefreshCw, CheckCircle2,
  Lock, Play, Terminal, Key, ShieldAlert, Cpu, Check, Activity, DollarSign,
  UserCheck, LogOut, ArrowRight, Layers
} from 'lucide-react';
import { audio } from './AudioEngine';

interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  user: UserProfile | null;
  onAdminAuthSuccess: (token: string, user: UserProfile) => void;
  onLogout: () => void;
  onRefreshUser: () => Promise<void>;
}

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({
  isOpen,
  onClose,
  token,
  user,
  onAdminAuthSuccess,
  onLogout,
  onRefreshUser,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'models' | 'users' | 'audit' | 'settings'>('overview');
  
  // Login State for Admin Portal
  const [loginEmail, setLoginEmail] = useState('admin@gahan.ai');
  const [loginPassword, setLoginPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Admin Data State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // User Management State
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'pro' | 'enterprise'>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editTier, setEditTier] = useState<'free' | 'pro' | 'enterprise'>('pro');
  const [extendTrialDays, setExtendTrialDays] = useState(7);

  // Model Playground Testing State
  const [testPrompt, setTestPrompt] = useState('Verify GAHAN AI model response latency and streaming throughput.');
  const [testModel, setTestModel] = useState('gemini-3.8-flash');
  const [testStreamText, setTestStreamText] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testTelemetry, setTestTelemetry] = useState<{ ttftMs?: number; totalMs?: number } | null>(null);

  // System Settings State
  const [freeDailyLimit, setFreeDailyLimit] = useState(20);
  const [freeTrialDays, setFreeTrialDays] = useState(7);
  const [proMonthlyLimit, setProMonthlyLimit] = useState(1000);
  const [mfaRequired, setMfaRequired] = useState(false);

  const fetchAdminStats = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setStats(data);
        if (data.settings) {
          setFreeDailyLimit(data.settings.defaultFreeDailyLimit);
          setFreeTrialDays(data.settings.defaultFreeTrialDays);
          setProMonthlyLimit(data.settings.proMonthlyLimit);
          setMfaRequired(data.settings.mfaRequiredForAdmin);
        }
      } else {
        setNotice(data.error || 'Admin authorization required.');
      }
    } catch (err: any) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && token && user?.role === 'admin') {
      fetchAdminStats();
    }
  }, [isOpen, token, user]);

  if (!isOpen) return null;

  const isAdminAuthenticated = user && user.role === 'admin' && token;

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    audio.playClick();

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          mfaCode: mfaCode.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Admin login failed');
      }

      audio.playWhoosh();
      onAdminAuthSuccess(data.token, data.user);
      window.history.pushState({}, '', '/admin/dashboard');
      setNotice('Authenticated into GAHAN AI Owner Portal.');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid credentials provided');
    } finally {
      setLoginLoading(false);
    }
  };

  // Password Change State
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    setPassLoading(true);
    audio.playClick();

    try {
      const res = await fetch('/api/admin/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword: currPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Password update failed.');
      }
      setPassMsg(data.message || 'Password updated successfully!');
      setCurrPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPassMsg(`Error: ${err.message}`);
    } finally {
      setPassLoading(false);
    }
  };

  const handleToggleModel = async (modelId: string, currentEnabled: boolean) => {
    audio.playClick();
    try {
      const res = await fetch('/api/admin/models/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ modelId, enabled: !currentEnabled })
      });
      if (res.ok) {
        setNotice(`Model ${modelId} set to ${!currentEnabled ? 'ENABLED' : 'DISABLED'}`);
        fetchAdminStats();
      }
    } catch (err) {
      console.error('Error toggling model:', err);
    }
  };

  const handleUpdateModelTiers = async (modelId: string, newTiers: Array<'free' | 'pro' | 'enterprise'>) => {
    audio.playClick();
    try {
      const res = await fetch('/api/admin/models/tiers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ modelId, allowedTiers: newTiers })
      });
      if (res.ok) {
        setNotice(`Updated allowed tiers for ${modelId}`);
        fetchAdminStats();
      }
    } catch (err) {
      console.error('Error updating model tiers:', err);
    }
  };

  const handleTestModelStream = async () => {
    if (!testPrompt.trim()) return;
    audio.playClick();
    setTestStreamText('');
    setTestLoading(true);
    setTestTelemetry(null);

    const startTime = performance.now();

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: testPrompt,
          requestedModel: testModel,
        })
      });

      if (!res.ok || !res.body) {
        throw new Error(`[HTTP ${res.status}] Failed to connect to stream`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let acc = '';
      let firstTokenTime: number | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                if (!firstTokenTime) {
                  firstTokenTime = Math.round(performance.now() - startTime);
                }
                acc += data.text;
                setTestStreamText(acc);
              }
              if (data.done) {
                const totalMs = data.telemetry?.totalMs || Math.round(performance.now() - startTime);
                setTestTelemetry({ ttftMs: firstTokenTime || 100, totalMs });
              }
            } catch (e) {
              // ignore
            }
          }
        }
      }
    } catch (err: any) {
      setTestStreamText(`[ERROR] ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  const handleUpdateUserTier = async () => {
    if (!selectedUser) return;
    audio.playClick();

    try {
      const res = await fetch('/api/admin/users/tier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          tier: editTier,
          extendTrialDays,
        })
      });

      if (res.ok) {
        audio.playWhoosh();
        setNotice(`User ${selectedUser.email} tier updated to ${editTier.toUpperCase()}`);
        setSelectedUser(null);
        fetchAdminStats();
      }
    } catch (err: any) {
      setNotice('Failed to update user tier.');
    }
  };

  const handleUpdateUserRole = async (userId: string, targetRole: 'user' | 'admin') => {
    audio.playClick();
    try {
      const res = await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, role: targetRole })
      });
      if (res.ok) {
        setNotice(`User role updated to ${targetRole.toUpperCase()}`);
        fetchAdminStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetUserDailyUsage = async (userId: string) => {
    audio.playClick();
    try {
      const res = await fetch('/api/admin/users/reset-daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        setNotice('User daily usage counter reset to 0.');
        fetchAdminStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async () => {
    audio.playClick();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          defaultFreeDailyLimit: freeDailyLimit,
          defaultFreeTrialDays: freeTrialDays,
          proMonthlyLimit,
          mfaRequiredForAdmin: mfaRequired,
        })
      });
      if (res.ok) {
        setNotice('Platform settings updated successfully.');
        fetchAdminStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered User List
  const filteredUsers = (stats?.usersList || []).filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = tierFilter === 'all' || u.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl animate-fade-in overflow-y-auto">
      <div className="glass-panel-glow w-[96vw] max-w-7xl h-[90vh] max-h-[950px] rounded-3xl p-6 sm:p-8 border border-purple-500/50 shadow-[0_0_50px_rgba(168,85,247,0.2)] relative text-left flex flex-col my-4 overflow-hidden">
        
        {/* ======================================================== */}
        {/* TOP BAR / OWNER IDENTITY HEADER                          */}
        {/* ================================================= realm */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-white/10 shrink-0 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 p-0.5 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-purple-300">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-[10px] font-mono text-purple-300 uppercase tracking-widest font-bold">
                  PLATFORM OWNER CONTROL CENTER
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white">GAHAN AI ADMIN PORTAL</h2>
            </div>
          </div>

          {isAdminAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block text-xs font-mono">
                <div className="text-white font-bold">{user.name}</div>
                <div className="text-[10px] text-purple-300">{user.email} · ADMIN ROLE</div>
              </div>

              <button
                onClick={fetchAdminStats}
                disabled={loading}
                title="Refresh Metrics"
                className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>

              <button
                onClick={() => { audio.playClick(); onLogout(); }}
                className="p-2.5 rounded-xl bg-slate-900 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1.5 text-xs font-mono"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">LOGOUT</span>
              </button>

              <button
                onClick={() => { audio.playClick(); onClose(); }}
                className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { audio.playClick(); onClose(); }}
              className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white transition-colors self-end"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Global Notice Bar */}
        {notice && (
          <div className="mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/40 text-purple-200 text-xs font-mono flex items-center justify-between shrink-0 animate-fade-in">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <span>{notice}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 1: UNAUTHENTICATED ADMIN LOGIN FORM                 */}
        {/* ======================================================== */}
        {!isAdminAuthenticated ? (
          <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
            <div className="w-full max-w-md p-8 rounded-3xl bg-slate-950/90 border border-purple-500/40 shadow-2xl space-y-6 font-mono text-left">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold font-display text-white">ADMINISTRATOR AUTHENTICATION</h3>
                <p className="text-xs text-slate-400">
                  Enter your owner credentials to access full platform management and model overrides.
                </p>
              </div>

              {loginError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                    ADMIN EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="admin@gahan.ai"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                    ADMIN PASSWORD
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] text-slate-400 uppercase tracking-wider">
                      MFA VERIFICATION CODE (OPTIONAL)
                    </label>
                    <span className="text-[9px] text-purple-300 font-semibold">CODE: 123456</span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="6-digit MFA Code (e.g. 123456)"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400 tracking-widest text-center"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2"
                >
                  {loginLoading ? 'VERIFYING CREDENTIALS...' : 'ACCESS ADMIN PORTAL'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-[10px] text-slate-400 text-center">
                Owner Portal Security: Initial account configured via server-side environment secret <span className="text-cyan-300 font-semibold">ADMIN_INITIAL_PASSWORD</span>.
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* VIEW 2: AUTHENTICATED ADMIN PORTAL DASHBOARD             */
          /* ======================================================== */
          <div className="flex-1 flex flex-col overflow-hidden pt-4">
            
            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-3 shrink-0 font-mono text-xs overflow-x-auto">
              <button
                onClick={() => { audio.playClick(); setActiveTab('overview'); }}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
                  activeTab === 'overview'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 font-bold shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>OVERVIEW & METRICS</span>
              </button>

              <button
                onClick={() => { audio.playClick(); setActiveTab('analytics'); }}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 font-bold shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>LATENCY & ANALYTICS</span>
              </button>

              <button
                onClick={() => { audio.playClick(); setActiveTab('models'); }}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
                  activeTab === 'models'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 font-bold shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>MODELS & PLAYGROUND</span>
              </button>

              <button
                onClick={() => { audio.playClick(); setActiveTab('users'); }}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
                  activeTab === 'users'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 font-bold shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>USER DIRECTORY ({stats?.usersList.length || 0})</span>
              </button>

              <button
                onClick={() => { audio.playClick(); setActiveTab('audit'); }}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
                  activeTab === 'audit'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 font-bold shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>AUDIT LOGS</span>
              </button>

              <button
                onClick={() => { audio.playClick(); setActiveTab('settings'); }}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
                  activeTab === 'settings'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 font-bold shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>SETTINGS</span>
              </button>
            </div>

            {/* TAB CONTENT AREA */}
            <div className="flex-1 overflow-y-auto pt-6 space-y-6">
              
              {/* TAB 1: OVERVIEW & METRICS */}
              {activeTab === 'overview' && stats && (
                <div className="space-y-6 font-mono text-xs">
                  {/* KPI Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/5 space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase">Total Users</div>
                      <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
                    </div>

                    <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/5 space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase">Active Trials</div>
                      <div className="text-2xl font-bold text-cyan-400">{stats.activeTrialUsers}</div>
                    </div>

                    <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/5 space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase">Pro / Enterprise</div>
                      <div className="text-2xl font-bold text-emerald-400">{stats.proSubscribers + stats.enterpriseAccounts}</div>
                    </div>

                    <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/5 space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase">Today API Usage</div>
                      <div className="text-2xl font-bold text-indigo-400">{stats.todayApiUsage}</div>
                    </div>

                    <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/5 space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase">Monthly API Usage</div>
                      <div className="text-2xl font-bold text-purple-400">{stats.monthlyApiUsage}</div>
                    </div>

                    <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/5 space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase">Est. Monthly Revenue</div>
                      <div className="text-2xl font-bold text-emerald-300">
                        ${stats.proSubscribers * 29 + stats.enterpriseAccounts * 199}
                      </div>
                    </div>
                  </div>

                  {/* System Health & Gemini Connectivity */}
                  <div className="p-6 rounded-2xl bg-slate-950/90 border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-bold flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span>GEMINI AI SYSTEM HEALTH & API CONNECTION</span>
                      </h4>
                      <span className="px-2.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        SYSTEM ONLINE
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-slate-300">
                      <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                        <div className="text-[10px] text-slate-400">AUTHENTICATION KEY</div>
                        <div className="text-cyan-300 font-bold">FRIEND_GEMINI_API_KEY</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                        <div className="text-[10px] text-slate-400">AVERAGE INFERENCE TTFT</div>
                        <div className="text-emerald-400 font-bold">&lt; 120 ms</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-white/5">
                        <div className="text-[10px] text-slate-400">RECENT FAILURE RATE</div>
                        <div className="text-purple-300 font-bold">{stats.errorCount} logged errors</div>
                      </div>
                    </div>
                  </div>

                  {/* Model Calls Breakdown */}
                  <div className="p-6 rounded-2xl bg-slate-950/90 border border-white/10 space-y-4">
                    <h4 className="text-slate-300 font-bold">MODEL INFERENCE DISTRIBUTION</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {stats.modelUsage.map((m, i) => (
                        <div key={i} className="p-3.5 rounded-xl bg-slate-900 border border-white/5 flex justify-between items-center">
                          <span className="text-white font-bold">{m.model}</span>
                          <span className="text-cyan-400 font-mono font-bold">{m.count} calls</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: LATENCY & ANALYTICS */}
              {activeTab === 'analytics' && (
                <div className="space-y-6 font-mono text-xs">
                  {/* Global Benchmark Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-950/80 p-5 rounded-2xl border border-cyan-500/30 space-y-1">
                      <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Avg Time To First Token (TTFT)</div>
                      <div className="text-3xl font-extrabold text-white">
                        {stats?.latencyAnalytics?.overallAvgTtftMs ?? 110} ms
                      </div>
                      <div className="text-[10px] text-slate-400">Target Benchmark: &lt; 200ms</div>
                    </div>

                    <div className="bg-slate-950/80 p-5 rounded-2xl border border-purple-500/30 space-y-1">
                      <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Avg Response Completion</div>
                      <div className="text-3xl font-extrabold text-white">
                        {stats?.latencyAnalytics?.overallAvgTotalMs ?? 420} ms
                      </div>
                      <div className="text-[10px] text-slate-400">Total streaming duration</div>
                    </div>

                    <div className="bg-slate-950/80 p-5 rounded-2xl border border-emerald-500/30 space-y-1">
                      <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Inference Success Rate</div>
                      <div className="text-3xl font-extrabold text-white">
                        {stats?.latencyAnalytics?.successRatePercent ?? 100}%
                      </div>
                      <div className="text-[10px] text-slate-400">{stats?.latencyAnalytics?.totalRequests ?? 0} Requests Tracked</div>
                    </div>

                    <div className="bg-slate-950/80 p-5 rounded-2xl border border-indigo-500/30 space-y-1">
                      <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Primary Active Model</div>
                      <div className="text-xl font-extrabold text-white">Gemini 3.8 Flash</div>
                      <div className="text-[10px] text-slate-400">Ultra-low latency default engine</div>
                    </div>
                  </div>

                  {/* Model Latency & Token Throughput Breakdown Table */}
                  <div className="bg-slate-950/80 p-6 rounded-2xl border border-white/10 space-y-4">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      <span>PER-MODEL LATENCY & THROUGHPUT BENCHMARKS</span>
                    </h4>

                    {stats?.latencyAnalytics?.modelMetrics && stats.latencyAnalytics.modelMetrics.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead>
                            <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase">
                              <th className="pb-3">Model Name</th>
                              <th className="pb-3">Total Requests</th>
                              <th className="pb-3">Avg TTFT</th>
                              <th className="pb-3">Avg Total Latency</th>
                              <th className="pb-3">Min / Max TTFT</th>
                              <th className="pb-3">Success / Error</th>
                              <th className="pb-3">Chars Processed (In / Out)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-slate-300">
                            {stats.latencyAnalytics.modelMetrics.map((m) => (
                              <tr key={m.model} className="hover:bg-white/5 transition-colors">
                                <td className="py-3 font-bold text-cyan-300">{m.model}</td>
                                <td className="py-3">{m.totalRequests}</td>
                                <td className="py-3 text-emerald-400 font-bold">{m.avgTtftMs} ms</td>
                                <td className="py-3 text-purple-300">{m.avgTotalMs} ms</td>
                                <td className="py-3 text-slate-400">{m.minTtftMs}ms / {m.maxTtftMs}ms</td>
                                <td className="py-3">
                                  <span className="text-emerald-400">{m.successCount}</span> / <span className="text-rose-400">{m.errorCount}</span>
                                </td>
                                <td className="py-3 text-slate-400">
                                  {m.totalInputChars.toLocaleString()} / {m.totalOutputChars.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-900 text-slate-400 text-xs">
                        No latency logs recorded yet. Send a message in the consultation modal or test a model in the playground to record live telemetry!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: MODELS & ADMIN PLAYGROUND */}
              {activeTab === 'models' && stats && (
                <div className="space-y-6 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold font-display text-white">ALL CONFIGURED GAHAN AI MODELS</h3>
                      <p className="text-slate-400 text-[11px]">
                        Owner account bypasses user locks. Enable or disable models and restrict subscription tiers.
                      </p>
                    </div>
                  </div>

                  {/* Models Config Table */}
                  <div className="space-y-4">
                    {stats.models.map((m) => (
                      <div
                        key={m.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          m.enabled
                            ? 'bg-slate-950 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                            : 'bg-slate-950/60 border-white/10 opacity-70'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                          <div className="space-y-1 max-w-xl">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white font-display">{m.name}</span>
                              <span className="text-[10px] text-slate-400">({m.id})</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                                m.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {m.status}
                              </span>
                            </div>
                            <p className="text-slate-300 text-xs font-sans">{m.description}</p>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {m.capabilities.map((cap, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-slate-900 border border-white/5 text-[9px] text-cyan-300">
                                  {cap}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
                            {/* Tier Checkboxes */}
                            <div className="space-y-1">
                              <div className="text-[10px] text-slate-400 uppercase">Allowed User Tiers:</div>
                              <div className="flex items-center gap-2 text-[11px]">
                                {(['free', 'pro', 'enterprise'] as const).map((t) => {
                                  const isChecked = m.allowedTiers.includes(t);
                                  return (
                                    <label key={t} className="flex items-center gap-1 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          const nextTiers = isChecked
                                            ? m.allowedTiers.filter(x => x !== t)
                                            : [...m.allowedTiers, t];
                                          handleUpdateModelTiers(m.id, nextTiers);
                                        }}
                                        className="rounded border-white/20 bg-slate-900 text-purple-500 focus:ring-purple-400"
                                      />
                                      <span className="uppercase text-slate-300">{t}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Enable Toggle */}
                            <button
                              onClick={() => handleToggleModel(m.id, m.enabled)}
                              className={`px-4 py-2.5 rounded-xl font-bold uppercase transition-all whitespace-nowrap ${
                                m.enabled
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40'
                                  : 'bg-slate-900 text-slate-400 border border-white/10 hover:border-cyan-400 hover:text-cyan-300'
                              }`}
                            >
                              {m.enabled ? 'DISABLE MODEL' : 'ENABLE MODEL'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ADMIN LIVE MODEL PLAYGROUND */}
                  <div className="p-6 rounded-2xl bg-slate-950 border border-purple-500/40 space-y-4">
                    <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                      <Terminal className="w-4 h-4" />
                      <span>ADMIN LIVE MODEL TESTING PLAYGROUND</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase mb-1">SELECT TEST MODEL</label>
                        <select
                          value={testModel}
                          onChange={(e) => setTestModel(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono"
                        >
                          {stats.models.map(m => (
                            <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-end">
                        <button
                          onClick={handleTestModelStream}
                          disabled={testLoading}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold uppercase flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          <span>{testLoading ? 'STREAMING TEST...' : 'RUN LIVE MODEL TEST'}</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">TEST PROMPT</label>
                      <input
                        type="text"
                        value={testPrompt}
                        onChange={(e) => setTestPrompt(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                      />
                    </div>

                    {/* Output Terminal */}
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 font-mono text-xs text-slate-200 min-h-[100px] whitespace-pre-wrap leading-relaxed">
                      {testStreamText || <span className="text-slate-500">// Output stream will render here in real-time...</span>}
                    </div>

                    {testTelemetry && (
                      <div className="flex gap-4 text-[10px] text-cyan-300">
                        <span>TTFT: <strong className="text-emerald-400">{testTelemetry.ttftMs}ms</strong></span>
                        <span>Total Duration: <strong className="text-purple-300">{testTelemetry.totalMs}ms</strong></span>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 3: USER DIRECTORY & ACCESS CONTROL */}
              {activeTab === 'users' && stats && (
                <div className="space-y-6 font-mono text-xs">
                  {/* Controls / Filter Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950 p-4 rounded-2xl border border-white/10">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search users by name or email..."
                      className="w-full sm:w-80 px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                    />

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-slate-400 text-[10px]">FILTER TIER:</span>
                      <select
                        value={tierFilter}
                        onChange={(e: any) => setTierFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs"
                      >
                        <option value="all">ALL TIERS</option>
                        <option value="free">FREE TRIAL</option>
                        <option value="pro">GAHAN PRO</option>
                        <option value="enterprise">GAHAN ENTERPRISE</option>
                      </select>
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="overflow-x-auto rounded-2xl border border-white/10">
                    <table className="w-full text-left bg-slate-950">
                      <thead className="bg-slate-900/90 text-slate-400 border-b border-white/10">
                        <tr>
                          <th className="p-3">USER ACCOUNT</th>
                          <th className="p-3">ROLE</th>
                          <th className="p-3">TIER</th>
                          <th className="p-3">DAILY USAGE</th>
                          <th className="p-3">TRIAL STATUS</th>
                          <th className="p-3 text-right">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-900/50">
                            <td className="p-3">
                              <div className="font-bold text-white">{u.name}</div>
                              <div className="text-[10px] text-slate-400">{u.email}</div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'text-slate-400'
                              }`}>
                                {u.role.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                u.tier === 'enterprise' ? 'bg-purple-500/20 text-purple-300' : u.tier === 'pro' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-300'
                              }`}>
                                {u.tier}
                              </span>
                            </td>
                            <td className="p-3">
                              {u.dailyUsageCount} / {u.dailyLimit}
                            </td>
                            <td className="p-3">
                              {u.isTrialExpired ? (
                                <span className="text-red-400 font-bold">Expired</span>
                              ) : (
                                <span className="text-emerald-400">{u.trialDaysLeft} days left</span>
                              )}
                            </td>
                            <td className="p-3 text-right space-x-2">
                              <button
                                onClick={() => setSelectedUser(u)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 border border-white/10"
                              >
                                Edit Tier
                              </button>
                              <button
                                onClick={() => handleUpdateUserRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-500/20 text-purple-300 border border-white/10"
                              >
                                {u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                              </button>
                              <button
                                onClick={() => handleResetUserDailyUsage(u.id)}
                                title="Reset daily message counter to 0"
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-500/20 text-emerald-300 border border-white/10"
                              >
                                Reset Usage
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Selected User Edit Panel */}
                  {selectedUser && (
                    <div className="p-6 rounded-2xl bg-slate-900 border border-purple-500/40 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-white font-bold">MODIFY USER TIER: {selectedUser.email}</h4>
                        <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-400 mb-2">SUBSCRIPTION TIER</label>
                          <select
                            value={editTier}
                            onChange={(e: any) => setEditTier(e.target.value)}
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
                        className="px-6 py-2.5 rounded-xl bg-purple-500 text-white font-bold hover:bg-purple-400"
                      >
                        SAVE SUBSCRIPTION CHANGES
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: AUDIT LOGS */}
              {activeTab === 'audit' && stats && (
                <div className="space-y-4 font-mono text-xs">
                  <h3 className="text-lg font-bold font-display text-white">SYSTEM SECURITY AUDIT LOGS</h3>
                  <div className="overflow-x-auto rounded-2xl border border-white/10">
                    <table className="w-full text-left bg-slate-950">
                      <thead className="bg-slate-900/90 text-slate-400 border-b border-white/10">
                        <tr>
                          <th className="p-3">TIMESTAMP</th>
                          <th className="p-3">ADMIN EMAIL</th>
                          <th className="p-3">ACTION</th>
                          <th className="p-3">DETAILS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        {(stats.auditLogs || []).map((log) => (
                          <tr key={log.id} className="hover:bg-slate-900/50">
                            <td className="p-3 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="p-3 font-bold text-white">{log.adminEmail}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                                {log.action}
                              </span>
                            </td>
                            <td className="p-3 text-slate-300">{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: SYSTEM SETTINGS */}
              {activeTab === 'settings' && (
                <div className="p-6 rounded-2xl bg-slate-950 border border-white/10 space-y-6 font-mono text-xs max-w-2xl">
                  <h3 className="text-lg font-bold font-display text-white">PLATFORM CONFIGURATION SETTINGS</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-400 mb-1">DEFAULT FREE TRIAL DAILY LIMIT (MESSAGES)</label>
                      <input
                        type="number"
                        value={freeDailyLimit}
                        onChange={(e) => setFreeDailyLimit(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">DEFAULT FREE TRIAL DURATION (DAYS)</label>
                      <input
                        type="number"
                        value={freeTrialDays}
                        onChange={(e) => setFreeTrialDays(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">PRO MONTHLY ALLOWANCE (MESSAGES)</label>
                      <input
                        type="number"
                        value={proMonthlyLimit}
                        onChange={(e) => setProMonthlyLimit(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                      />
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mfaRequired}
                          onChange={(e) => setMfaRequired(e.target.checked)}
                          className="rounded border-white/20 bg-slate-900 text-purple-500 focus:ring-purple-400"
                        />
                        <div>
                          <div className="text-white font-bold">REQUIRE MFA CODE FOR ADMIN PORTAL LOGIN</div>
                          <div className="text-[10px] text-slate-400">Enforces 6-digit MFA verification step on admin login</div>
                        </div>
                      </label>
                    </div>

                    <button
                      onClick={handleSaveSettings}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                    >
                      SAVE PLATFORM CONFIGURATION
                    </button>
                  </div>

                  {/* OWNER PASSWORD MANAGEMENT */}
                  <div className="pt-6 border-t border-white/10 space-y-4">
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Security Recommendation: We strongly recommend changing the initial administrator password after first login.</span>
                    </div>

                    <h4 className="text-sm font-bold font-display text-white">UPDATE OWNER ADMINISTRATOR PASSWORD</h4>

                    {passMsg && (
                      <div className={`p-3 rounded-xl border text-xs font-mono ${
                        passMsg.startsWith('Error')
                          ? 'bg-red-500/10 border-red-500/30 text-red-300'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      }`}>
                        {passMsg}
                      </div>
                    )}

                    <form onSubmit={handleChangePassword} className="space-y-3">
                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase mb-1">CURRENT PASSWORD</label>
                        <input
                          type="password"
                          required
                          value={currPassword}
                          onChange={(e) => setCurrPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase mb-1">NEW SECURE PASSWORD</label>
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={passLoading}
                        className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-wider transition-all"
                      >
                        {passLoading ? 'UPDATING PASSWORD...' : 'UPDATE ADMIN PASSWORD'}
                      </button>
                    </form>
                  </div>

                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
