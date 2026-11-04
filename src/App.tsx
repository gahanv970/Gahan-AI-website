import React, { useState, useEffect, useCallback } from 'react';
import { SceneSettings, UserProfile } from './types';
import { ThreeCanvas } from './components/ThreeCanvas';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { StorySection } from './components/StorySection';
import { ServicesSection } from './components/ServicesSection';
import { InnovationsSection } from './components/InnovationsSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { BottomControlDock } from './components/BottomControlDock';
import { AIChatModal } from './components/AIChatModal';
import { AuthModal } from './components/AuthModal';
import { PricingModal } from './components/PricingModal';
import { UpgradeModal } from './components/UpgradeModal';
import { AdminPortalModal } from './components/AdminPortalModal';
import { CustomCursor } from './components/CustomCursor';
import { audio } from './components/AudioEngine';
import { Sparkles, Bot } from 'lucide-react';

export default function App() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null);
  
  // Modals & Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatPrompt, setChatPrompt] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
  // Auth state
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('gahan_jwt_token'));
  const [user, setUser] = useState<UserProfile | null>(null);

  const [isAudioMuted, setIsAudioMuted] = useState(true);

  const [sceneSettings, setSceneSettings] = useState<SceneSettings>({
    coreRotationSpeed: 1.0,
    particleDensity: 2000,
    lightingMode: 'cyan-cyber',
    explodedViewRatio: 0,
    zenMode: false,
    orbitControlsEnabled: false,
    wireframeMode: false,
    audioMuted: true,
  });

  // Fetch current user profile from token
  const fetchUserProfile = useCallback(async () => {
    const currentToken = localStorage.getItem('gahan_jwt_token');
    if (!currentToken) {
      setUser(null);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('gahan_jwt_token');
        setToken(null);
        setUser(null);
      }
    } catch (e) {
      console.error('Failed to fetch user profile:', e);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleAuthSuccess = (newToken: string, newUser: UserProfile) => {
    localStorage.setItem('gahan_jwt_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setIsAuthOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('gahan_jwt_token');
    setToken(null);
    setUser(null);
  };

  // Track window scroll progress normalized between 0 and 1
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        const currentProgress = Math.min(1, Math.max(0, window.scrollY / totalScroll));
        setScrollProgress(currentProgress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleUpdateSettings = (newSettings: Partial<SceneSettings>) => {
    setSceneSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleToggleAudio = () => {
    const nextState = !isAudioMuted;
    setIsAudioMuted(nextState);
    audio.setMuted(nextState);
    handleUpdateSettings({ audioMuted: nextState });
  };

  const handleOpenChatWithPrompt = (prompt: string) => {
    setChatPrompt(prompt);
    setIsChatOpen(true);
  };

  // Check for dedicated /admin/login and /admin/dashboard routes
  useEffect(() => {
    const checkAdminRoute = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/admin/login' || path === '/admin/dashboard' || path === '/admin' || window.location.hash.startsWith('#admin')) {
        setIsAdminOpen(true);
      }
    };

    checkAdminRoute();
    window.addEventListener('popstate', checkAdminRoute);
    return () => window.removeEventListener('popstate', checkAdminRoute);
  }, []);

  const handleCloseAdmin = () => {
    setIsAdminOpen(false);
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/admin')) {
      window.history.pushState({}, '', '/');
    }
  };

  return (
    <div className="relative min-h-screen bg-[#030712] text-slate-100 overflow-hidden font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Custom Interactive Pointer */}
      <CustomCursor />

      {/* Full-Screen 3D WebGL Canvas Layer */}
      <ThreeCanvas
        settings={sceneSettings}
        scrollProgress={scrollProgress}
        activeServiceId={activeServiceId}
        onSelectService={(id) => setActiveServiceId(id)}
      />

      {/* Main UI Overlay Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header
          onOpenChat={() => {
            setChatPrompt(null);
            setIsChatOpen(true);
          }}
          isAudioMuted={isAudioMuted}
          onToggleAudio={handleToggleAudio}
          user={user}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenPricing={() => setIsPricingOpen(true)}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onLogout={handleLogout}
        />

        <main className="flex-1">
          <HeroSection
            onOpenChat={() => {
              setChatPrompt(null);
              setIsChatOpen(true);
            }}
          />

          <StorySection />

          <ServicesSection
            activeServiceId={activeServiceId}
            onSelectService={(id) => setActiveServiceId(id)}
            onOpenChatWithPrompt={handleOpenChatWithPrompt}
          />

          <InnovationsSection />

          <ContactSection
            onOpenChatWithPrompt={handleOpenChatWithPrompt}
          />
        </main>

        <Footer />
      </div>

      {/* Floating GAHAN AI Assistant Orb Button (Pinned to Bottom-Right) */}
      <button
        onClick={() => {
          audio.playClick();
          audio.playWhoosh();
          setChatPrompt(null);
          setIsChatOpen(true);
        }}
        aria-label="Open GAHAN AI Assistant"
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-2xl bg-slate-950/90 border border-cyan-400/50 text-white shadow-[0_0_25px_rgba(56,189,248,0.5)] hover:shadow-[0_0_35px_rgba(56,189,248,0.8)] hover:scale-105 transition-all flex items-center gap-3 backdrop-blur-xl group"
      >
        <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center animate-pulse">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="text-left font-mono text-xs">
          <div className="font-bold text-cyan-300 flex items-center gap-1">
            <span>GAHAN AI</span>
            <Sparkles className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="text-[10px] text-slate-400">ASK ASSISTANT</div>
        </div>
      </button>

      {/* Collapsible 3D Bottom Control Dock */}
      <BottomControlDock
        settings={sceneSettings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Functional AI Assistant Chat Modal */}
      <AIChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        initialPrompt={chatPrompt}
        user={user}
        token={token}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenUpgrade={() => setIsUpgradeOpen(true)}
        onOpenPricing={() => setIsPricingOpen(true)}
        onRefreshUser={fetchUserProfile}
      />

      {/* User Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Pricing Matrix & Checkout Modal */}
      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        user={user}
        token={token}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSubscriptionUpdated={fetchUserProfile}
      />

      {/* Trial Expired / Model Locked Upgrade Prompt Modal */}
      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        onOpenPricing={() => {
          setIsUpgradeOpen(false);
          setIsPricingOpen(true);
        }}
        user={user}
      />

      {/* Platform Owner Admin Portal Modal */}
      <AdminPortalModal
        isOpen={isAdminOpen}
        onClose={handleCloseAdmin}
        token={token}
        user={user}
        onAdminAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
        onRefreshUser={fetchUserProfile}
      />

    </div>
  );
}

