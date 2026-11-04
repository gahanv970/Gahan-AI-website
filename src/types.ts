export interface ServiceItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  description: string;
  iconName: string;
  color: string;
  capabilities: string[];
  specs: { label: string; value: string }[];
  threeDType: 'ai-sphere' | 'ml-matrix' | 'web-prism' | 'automation-rings' | 'cloud-nodes' | 'cyber-shield';
}

export interface ResearchPaper {
  id: string;
  title: string;
  codeName: string;
  date: string;
  readTime: string;
  abstract: string;
  metrics: { label: string; value: string; change: string }[];
  tags: string[];
  badgeText: string;
}

export interface InteractiveSimulationConfig {
  weightSparsity: number;
  learningRate: number;
  quantumEntanglement: number;
  neuralDepth: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  telemetry?: {
    ttftMs?: number;
    totalMs?: number;
  };
}

export interface CameraPreset {
  name: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface SceneSettings {
  coreRotationSpeed: number;
  particleDensity: number;
  lightingMode: 'cyan-cyber' | 'deep-violet' | 'quantum-gold' | 'monochrome';
  explodedViewRatio: number;
  zenMode: boolean;
  orbitControlsEnabled: boolean;
  wireframeMode: boolean;
  audioMuted: boolean;
}

// FREEMIUM SUBSCRIPTION & USER AUTH TYPES
export type UserRole = 'user' | 'admin';
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tier: SubscriptionTier;
  createdAt: string;
  trialStartedAt: string;
  trialExpiresAt: string;
  proExpiresAt?: string;
  isTrialExpired: boolean;
  trialDaysLeft: number;
  dailyUsageCount: number;
  dailyLimit: number;
  monthlyUsageCount: number;
  monthlyLimit: number;
  allowedModels: string[];
  mfaEnabled?: boolean;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface ModelConfigRecord {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
  allowedTiers: SubscriptionTier[];
  capabilities: string[];
  status: 'active' | 'maintenance' | 'deprecated';
  description: string;
}

export interface AuditLogRecord {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface ModelLatencyMetric {
  model: string;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgTtftMs: number;
  avgTotalMs: number;
  minTtftMs: number;
  maxTtftMs: number;
  totalInputChars: number;
  totalOutputChars: number;
}

export interface LatencyAnalytics {
  overallAvgTtftMs: number;
  overallAvgTotalMs: number;
  totalRequests: number;
  successRatePercent: number;
  modelMetrics: ModelLatencyMetric[];
}

export interface AdminStats {
  totalUsers: number;
  activeTrialUsers: number;
  proSubscribers: number;
  enterpriseAccounts: number;
  todayApiUsage: number;
  monthlyApiUsage: number;
  errorCount: number;
  modelUsage: { model: string; count: number }[];
  usersList: UserProfile[];
  models: ModelConfigRecord[];
  auditLogs: AuditLogRecord[];
  latencyAnalytics?: LatencyAnalytics;
  settings: {
    defaultFreeDailyLimit: number;
    defaultFreeTrialDays: number;
    proMonthlyLimit: number;
    enterpriseMonthlyLimit: number;
    mfaRequiredForAdmin: boolean;
  };
}


