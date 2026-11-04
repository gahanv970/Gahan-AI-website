import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, UserProfile } from '../types';
import { X, Send, Bot, User, RefreshCw, Copy, Check, Plus, Zap, Clock, Cpu, Code, Workflow, ShieldCheck, Trash2, Sparkles, MessageSquare, Lock, AlertTriangle, ChevronDown } from 'lucide-react';
import { audio } from './AudioEngine';

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string | null;
  user: UserProfile | null;
  token: string | null;
  onOpenAuth: () => void;
  onOpenUpgrade: () => void;
  onOpenPricing: () => void;
  onRefreshUser: () => Promise<void>;
}

// Custom 2D/Canvas animated 3D AI Orb representation for GAHAN AI Workspace
const AnimatedAIOrb: React.FC<{ isProcessing: boolean; size?: number }> = ({ isProcessing, size = 80 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = size * 0.32;

      angle += isProcessing ? 0.08 : 0.02;

      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius * 1.8);
      grad.addColorStop(0, isProcessing ? 'rgba(56, 189, 248, 0.95)' : 'rgba(56, 189, 248, 0.6)');
      grad.addColorStop(0.5, isProcessing ? 'rgba(129, 140, 248, 0.7)' : 'rgba(129, 140, 248, 0.35)');
      grad.addColorStop(1, 'rgba(3, 7, 18, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isProcessing ? '#38bdf8' : '#818cf8';
      ctx.lineWidth = isProcessing ? 2.5 : 1.5;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius * 0.4, Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-angle * 1.3);
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 0.9, radius * 0.35, -Math.PI / 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, isProcessing ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();

      frameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frameId);
  }, [isProcessing, size]);

  return <canvas ref={canvasRef} width={size * 1.5} height={size * 1.5} style={{ width: `${size}px`, height: `${size}px` }} className="shrink-0" />;
};

export const AIChatModal: React.FC<AIChatModalProps> = ({
  isOpen,
  onClose,
  initialPrompt,
  user,
  token,
  onOpenAuth,
  onOpenUpgrade,
  onOpenPricing,
  onRefreshUser,
}) => {
  const initialWelcomeMsg: ChatMessage = {
    id: 'welcome-1',
    sender: 'ai',
    text: 'Welcome to the GAHAN AI Consultation Workspace. I am your intelligent AI assistant.\n\nHow can I assist your enterprise today with AI research, custom model fine-tuning, software architecture, or spatial WebGL engineering?',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialWelcomeMsg]);
  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestionPrompts = [
    'Hi, introducing GAHAN AI.',
    'What enterprise AI and software services do you offer?',
    'How does GAHAN AI achieve sub-millisecond inference?',
    'Explain GAHAN AI\'s 3D Spatial WebGL architecture.'
  ];

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, statusText]);

  const handleModelSelect = (model: string) => {
    audio.playClick();
    if (model !== 'gemini-3.8-flash' && (!user || user.tier === 'free')) {
      onOpenUpgrade();
      return;
    }
    setSelectedModel(model);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    if (!user) {
      onOpenAuth();
      return;
    }

    if (user.isTrialExpired && user.tier === 'free') {
      onOpenUpgrade();
      return;
    }

    audio.playClick();
    const startTime = performance.now();

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const aiMsgId = `ai-${Date.now()}`;
    const initialAiMsg: ChatMessage = {
      id: aiMsgId,
      sender: 'ai',
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg, initialAiMsg]);
    if (!textToSend) setInputText('');
    setIsLoading(true);
    setStatusText('Connecting to GAHAN AI...');

    try {
      abortControllerRef.current = new AbortController();

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers,
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          message: text,
          model: selectedModel,
          history: messages.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });

      if (!response.ok || !response.body) {
        const errorJson = await response.json().catch(() => ({}));
        const errDetail = errorJson.error || errorJson.details || `HTTP ${response.status}`;
        
        if (errorJson.code === 'TRIAL_EXPIRED' || errorJson.code === 'DAILY_LIMIT_EXCEEDED' || errorJson.code === 'MODEL_LOCKED') {
          setTimeout(() => onOpenUpgrade(), 600);
        }

        throw new Error(`[${errorJson.code || 'LIMIT_EXCEEDED'}] ${errDetail}`);
      }

      setStatusText('Thinking...');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let firstTokenTime: number | null = null;
      let totalMs: number | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMsgId ? { ...msg, text: data.error } : msg
                  )
                );
                setStatusText('Notice');
                setIsLoading(false);
                if (data.code === 'TRIAL_EXPIRED' || data.code === 'DAILY_LIMIT_EXCEEDED') {
                  setTimeout(() => onOpenUpgrade(), 600);
                }
                return;
              }

              if (data.text) {
                if (!firstTokenTime) {
                  firstTokenTime = Math.round(performance.now() - startTime);
                  setStatusText('Generating response...');
                  audio.playNeuralPulse();
                }
                accumulatedText += data.text;

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMsgId ? { ...msg, text: accumulatedText } : msg
                  )
                );
              }

              if (data.done) {
                totalMs = data.telemetry?.totalMs || Math.round(performance.now() - startTime);
                const ttftMs = data.telemetry?.ttftMs || firstTokenTime || 120;

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMsgId
                      ? {
                          ...msg,
                          text: accumulatedText || 'GAHAN AI consultation complete.',
                          telemetry: { ttftMs, totalMs: totalMs ?? undefined },
                        }
                      : msg
                  )
                );
                setStatusText('Response complete.');
                // Refresh user usage counts
                onRefreshUser();
              }
            } catch (e) {
              // Ignore non-json SSE lines
            }
          }
        }
      }

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Chat stream error:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                text: err.message || 'GAHAN AI connection exception. Please check network.',
              }
            : msg
        )
      );
      setStatusText('Error');
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusText(''), 1500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewConversation = () => {
    audio.playClick();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
    setStatusText('');
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: 'New consultation workspace active. I am GAHAN AI. What technical or strategic topic shall we discuss?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleClearHistory = () => {
    audio.playClick();
    setMessages([]);
  };

  const copyMessageText = (id: string, text: string) => {
    audio.playClick();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-2xl animate-fade-in">
      <div className="glass-panel-glow w-[95vw] max-w-6xl h-[88vh] max-h-[900px] rounded-3xl flex flex-col border border-cyan-500/40 shadow-2xl relative overflow-hidden text-left">
        
        {/* WORKSPACE TWO-COLUMN / RESPONSIVE CONTAINER */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          
          {/* ======================================================== */}
          {/* LEFT PANEL: ASSISTANT IDENTITY & WORKSPACE NAVIGATION    */}
          {/* ======================================================== */}
          <div className="lg:w-[320px] xl:w-[360px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 bg-slate-950/90 p-6 flex flex-col justify-between overflow-y-auto space-y-6">
            
            {/* Upper Identity Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between lg:justify-start gap-4">
                <AnimatedAIOrb isProcessing={isLoading} size={64} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-widest">
                      {isLoading ? 'PROCESSING MATRIX' : 'ONLINE · READY'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold font-display text-white mt-1">GAHAN AI</h2>
                  <p className="text-[11px] font-mono text-slate-400">Intelligence. Beyond Limits.</p>
                </div>
              </div>

              {/* USER TIER & DAILY USAGE METER CARD */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="uppercase font-bold">{user?.tier || 'FREE'} PLAN</span>
                  </div>
                  {!user ? (
                    <button
                      onClick={() => { audio.playClick(); onOpenAuth(); }}
                      className="text-[10px] font-mono text-cyan-300 hover:underline"
                    >
                      Log In
                    </button>
                  ) : user.tier === 'free' ? (
                    <button
                      onClick={() => { audio.playClick(); onOpenPricing(); }}
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30"
                    >
                      UPGRADE
                    </button>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      PRO UNLOCKED
                    </span>
                  )}
                </div>

                {user && (
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-slate-300">
                      <span>Daily Messages:</span>
                      <span className="text-cyan-300 font-bold">
                        {user.dailyUsageCount} / {user.dailyLimit}
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          user.dailyUsageCount >= user.dailyLimit
                            ? 'bg-red-500'
                            : user.dailyUsageCount / user.dailyLimit > 0.8
                            ? 'bg-amber-400'
                            : 'bg-cyan-400'
                        }`}
                        style={{ width: `${Math.min(100, (user.dailyUsageCount / user.dailyLimit) * 100)}%` }}
                      />
                    </div>

                    {user.tier === 'free' && (
                      <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Trial Status:</span>
                        {user.isTrialExpired ? (
                          <span className="text-red-400 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> EXPIRED
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-semibold">
                            {user.trialDaysLeft}d remaining
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* MODEL SELECTOR DROPDOWN */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  AI ENGINE MODEL
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', desc: 'Fast, Standard Intelligence', tier: 'free' },
                    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', desc: 'Precision Reasoning', tier: 'pro' },
                    { id: 'gemini-flash-latest', name: 'Gemini Flash Ultra', desc: 'Sub-100ms Inference', tier: 'pro' },
                  ].map((m) => {
                    const isLocked = m.tier === 'pro' && (!user || user.tier === 'free');
                    const isSelected = selectedModel === m.id;

                    return (
                      <button
                        key={m.id}
                        onClick={() => handleModelSelect(m.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between font-mono ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                            : 'bg-slate-900/60 border-white/5 hover:border-white/20 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <span>{m.name}</span>
                            {m.tier === 'pro' && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">PRO</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">{m.desc}</div>
                        </div>

                        {isLocked ? (
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                        ) : isSelected ? (
                          <Check className="w-4 h-4 text-cyan-400" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Capability Focus Areas */}
              <div className="space-y-2 hidden sm:block">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">CORE CAPABILITIES</div>
                <div className="grid grid-cols-1 gap-2 text-xs font-mono text-slate-300">
                  <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/50 border border-white/5">
                    <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>AI Research & Neural Tuning</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/50 border border-white/5">
                    <Code className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Software & WebGL Apps</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/50 border border-white/5">
                    <Workflow className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Enterprise Automation</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/50 border border-white/5">
                    <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Quantum Security Shield</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lower Workspace Controls & Telemetry */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleNewConversation}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500/20 to-indigo-600/20 hover:from-cyan-500/30 hover:to-indigo-600/30 border border-cyan-500/40 text-cyan-300 hover:text-white transition-all text-xs font-mono font-semibold flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>NEW CONSULTATION</span>
                </button>

                <button
                  onClick={handleClearHistory}
                  className="w-full py-2 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-400 hover:text-slate-200 transition-colors text-[11px] font-mono flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>CLEAR SESSION</span>
                </button>
              </div>

              {/* System Telemetry Badge */}
              <div className="p-3 rounded-xl bg-slate-950 border border-white/5 text-[10px] font-mono text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>ACTIVE ENGINE:</span>
                  <span className="text-cyan-400 font-semibold">{selectedModel}</span>
                </div>
                <div className="flex justify-between">
                  <span>LATENCY:</span>
                  <span className="text-emerald-400 font-semibold">&lt; 120ms TTFT</span>
                </div>
              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* RIGHT PANEL: MAIN CONVERSATION STREAM & COMPOSER         */}
          {/* ======================================================== */}
          <div className="flex-1 flex flex-col bg-slate-950/60 overflow-hidden">
            
            {/* Top Workspace Bar */}
            <div className="px-6 py-4 border-b border-white/10 bg-slate-950/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 glow-cyan" />
                <div>
                  <h3 className="text-sm font-bold font-display text-white">GAHAN AI STRATEGIC CONSULTATION</h3>
                  <p className="text-[10px] font-mono text-slate-400">Real-Time Streaming Matrix</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    audio.playClick();
                    if (abortControllerRef.current) abortControllerRef.current.abort();
                    onClose();
                  }}
                  className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:border-cyan-400 transition-colors flex items-center gap-1.5 text-xs font-mono"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">CLOSE</span>
                </button>
              </div>
            </div>

            {/* Conversation Messages Stream Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((msg) => {
                const isAI = msg.sender === 'ai';
                if (isAI && !msg.text && isLoading) return null;

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 text-sm ${isAI ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAI && (
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0 mt-1 shadow-[0_0_10px_rgba(56,189,248,0.3)]">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] p-5 rounded-2xl relative group font-sans leading-relaxed text-sm ${
                        isAI
                          ? 'bg-slate-900/90 text-slate-100 border border-white/10 shadow-lg'
                          : 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 text-white shadow-[0_0_20px_rgba(56,189,248,0.35)]'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                      
                      <div className="flex items-center justify-between gap-4 mt-3 pt-2.5 border-t border-white/10 text-[10px] font-mono text-slate-400">
                        <div className="flex items-center gap-3">
                          <span>{msg.timestamp}</span>
                          {msg.telemetry && (
                            <span className="text-cyan-400/90 flex items-center gap-1 font-semibold">
                              <Zap className="w-3 h-3 text-cyan-400" />
                              <span>TTFT: {msg.telemetry.ttftMs}ms · Total: {msg.telemetry.totalMs}ms</span>
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => copyMessageText(msg.id, msg.text)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-cyan-300 flex items-center gap-1"
                        >
                          {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {!isAI && (
                      <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0 mt-1">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Dynamic Loading Status Indicator */}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  </div>
                  <div className="bg-slate-900/90 px-4 py-3 rounded-2xl border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-2 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                    <Clock className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
                    <span>{statusText || 'Connecting to GAHAN AI...'}</span>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Suggested Prompts Array (Clean wrap, no horizontal scrollbars) */}
            <div className="px-6 py-2.5 bg-slate-950/80 border-t border-white/5 flex flex-wrap gap-2 shrink-0">
              {suggestionPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-white/10 hover:border-cyan-400/50 text-[11px] font-mono text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>

            {/* Fixed-Bottom Message Composer */}
            <div className="p-4 sm:p-5 bg-slate-950/90 border-t border-white/10 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-end gap-3"
              >
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    rows={2}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Consult GAHAN AI (Press Enter to send, Shift+Enter for new line)..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                  <div className="text-[10px] font-mono text-slate-500 mt-1 pl-1 hidden sm:block">
                    Press Enter to send · Shift+Enter for new line
                  </div>
                </div>

                {isLoading ? (
                  <button
                    type="button"
                    onClick={() => {
                      audio.playClick();
                      if (abortControllerRef.current) {
                        abortControllerRef.current.abort();
                      }
                      setIsLoading(false);
                      setStatusText('Cancelled.');
                    }}
                    className="px-5 py-4 rounded-xl bg-rose-500/20 border border-rose-500/50 hover:bg-rose-500/30 text-rose-300 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 h-[52px]"
                  >
                    <X className="w-4 h-4 text-rose-400" />
                    <span>STOP</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider disabled:opacity-40 transition-all shadow-[0_0_20px_rgba(56,189,248,0.4)] flex items-center gap-2 shrink-0 h-[52px]"
                  >
                    <span>SEND</span>
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </form>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
