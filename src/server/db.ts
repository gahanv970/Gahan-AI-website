import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'gahan_db.json');

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  tier: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  trialStartedAt: string;
  trialExpiresAt: string;
  proExpiresAt?: string;
  dailyLimitOverride?: number;
  monthlyLimitOverride?: number;
  mfaSecret?: string;
  mfaEnabled?: boolean;
}

export interface SessionRecord {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface UsageRecord {
  id: string;
  userId: string;
  model: string;
  timestamp: string;
  dateStr: string; // YYYY-MM-DD
  monthStr: string; // YYYY-MM
  status: 'success' | 'error';
  errorMessage?: string;
  ttftMs?: number;
  totalMs?: number;
  inputChars?: number;
  outputChars?: number;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  tier: 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired';
  amount: number;
  paymentRef: string;
  createdAt: string;
  expiresAt: string;
}

export interface ModelConfigRecord {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
  allowedTiers: Array<'free' | 'pro' | 'enterprise'>;
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

export interface AppSettings {
  defaultFreeDailyLimit: number;
  defaultFreeTrialDays: number;
  proMonthlyLimit: number;
  enterpriseMonthlyLimit: number;
  mfaRequiredForAdmin: boolean;
}

export interface DatabaseSchema {
  users: UserRecord[];
  sessions: SessionRecord[];
  usageLogs: UsageRecord[];
  subscriptions: SubscriptionRecord[];
  models: ModelConfigRecord[];
  auditLogs: AuditLogRecord[];
  settings: AppSettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultFreeDailyLimit: 20,
  defaultFreeTrialDays: 7,
  proMonthlyLimit: 1000,
  enterpriseMonthlyLimit: 10000,
  mfaRequiredForAdmin: false,
};

const DEFAULT_MODELS: ModelConfigRecord[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    provider: 'Google Gemini API',
    enabled: true,
    allowedTiers: ['free', 'pro', 'enterprise'],
    capabilities: ['Sub-Millisecond Inference', 'Standard Chat', 'Coding Assistance', 'Structured Reasoning'],
    status: 'active',
    description: 'Default primary model delivering ultra-fast responses and reliable streaming throughput.',
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    provider: 'Google Gemini API',
    enabled: true,
    allowedTiers: ['pro', 'enterprise'],
    capabilities: ['Deep Reasoning', 'Software Architecture', 'Complex Problem Solving'],
    status: 'active',
    description: 'Advanced precision model tuned for complex technical analysis and architecture design.',
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Ultra',
    provider: 'Google Gemini API',
    enabled: true,
    allowedTiers: ['pro', 'enterprise'],
    capabilities: ['Sub-100ms Inference', 'High-Velocity Streaming', 'Agent Automation'],
    status: 'active',
    description: 'Ultra low latency model optimized for high-throughput streaming interactions.',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google Gemini API',
    enabled: false,
    allowedTiers: ['enterprise'],
    capabilities: ['Legacy Multimodal', 'Standard Text'],
    status: 'maintenance',
    description: 'Legacy model retained for fallback inspection and sandbox testing.',
  },
];

class PersistentDatabase {
  private db: DatabaseSchema = {
    users: [],
    sessions: [],
    usageLogs: [],
    subscriptions: [],
    models: DEFAULT_MODELS,
    auditLogs: [],
    settings: DEFAULT_SETTINGS,
  };

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.db = JSON.parse(raw);
        if (!this.db.settings) {
          this.db.settings = DEFAULT_SETTINGS;
        }
        if (!this.db.models || this.db.models.length === 0) {
          this.db.models = DEFAULT_MODELS;
        }
        if (!this.db.auditLogs) {
          this.db.auditLogs = [];
        }
      } catch (err) {
        console.error('[DB] Error parsing database file, creating fresh schema:', err);
        this.saveSync();
      }
    } else {
      this.seedDefaultAdmin();
      this.saveSync();
    }

    // Ensure default admin account exists
    if (!this.db.users.some(u => u.role === 'admin')) {
      this.seedDefaultAdmin();
      this.saveSync();
    }
  }

  private seedDefaultAdmin() {
    const existing = this.getUserByEmail('admin@gahan.ai');
    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD?.trim() || 'admin123password';
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(initialPassword, salt);
    const now = new Date();
    const trialExpires = new Date(now.getTime() + 365 * 10 * 24 * 60 * 60 * 1000);

    if (existing) {
      // Ensure existing owner account maintains admin role and enterprise tier
      existing.role = 'admin';
      existing.tier = 'enterprise';
      this.saveSync();
      return;
    }

    const adminUser: UserRecord = {
      id: 'usr_admin_default',
      name: 'GAHAN Owner Admin',
      email: 'admin@gahan.ai',
      passwordHash,
      role: 'admin',
      tier: 'enterprise',
      createdAt: now.toISOString(),
      trialStartedAt: now.toISOString(),
      trialExpiresAt: trialExpires.toISOString(),
      mfaEnabled: false,
    };

    this.db.users.push(adminUser);
    console.log('[DB] Initial GAHAN AI Owner Administrator account provisioned (admin@gahan.ai)');
  }

  private saveSync() {
    try {
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.db, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('[DB] Failed to save database to disk:', err);
    }
  }

  // Settings
  public getSettings(): AppSettings {
    return { ...this.db.settings };
  }

  public updateSettings(newSettings: Partial<AppSettings>): AppSettings {
    this.db.settings = { ...this.db.settings, ...newSettings };
    this.saveSync();
    return this.getSettings();
  }

  // Users
  public getUserByEmail(email: string): UserRecord | undefined {
    return this.db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): UserRecord | undefined {
    return this.db.users.find(u => u.id === id);
  }

  public createUser(name: string, email: string, passwordHash: string): UserRecord {
    const now = new Date();
    const trialDays = this.db.settings.defaultFreeTrialDays || 7;
    const trialExpires = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const user: UserRecord = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'user', // STRICT: Prevent ordinary registration from becoming admin
      tier: 'free',
      createdAt: now.toISOString(),
      trialStartedAt: now.toISOString(),
      trialExpiresAt: trialExpires.toISOString(),
    };

    this.db.users.push(user);
    this.saveSync();
    return user;
  }

  public updateUserTier(userId: string, tier: 'free' | 'pro' | 'enterprise', days = 30): UserRecord | undefined {
    const user = this.getUserById(userId);
    if (!user) return undefined;

    user.tier = tier;
    if (tier !== 'free') {
      const now = new Date();
      const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      user.proExpiresAt = expires.toISOString();
    }

    this.saveSync();
    return user;
  }

  public updateUserRole(userId: string, role: 'user' | 'admin'): UserRecord | undefined {
    const user = this.getUserById(userId);
    if (!user) return undefined;
    user.role = role;
    this.saveSync();
    return user;
  }

  public resetUserDailyUsage(userId: string) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    this.db.usageLogs = this.db.usageLogs.filter(
      u => !(u.userId === userId && u.dateStr === dateStr)
    );
    this.saveSync();
  }

  public getAllUsers(): UserRecord[] {
    return [...this.db.users];
  }

  // Models Management
  public getModels(): ModelConfigRecord[] {
    return [...this.db.models];
  }

  public updateModelConfig(modelId: string, updates: Partial<ModelConfigRecord>): ModelConfigRecord | undefined {
    const model = this.db.models.find(m => m.id === modelId);
    if (!model) return undefined;

    Object.assign(model, updates);
    this.saveSync();
    return model;
  }

  // Audit Logging
  public logAudit(adminId: string, adminEmail: string, action: string, details: string): AuditLogRecord {
    const record: AuditLogRecord = {
      id: `adt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      adminId,
      adminEmail,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    this.db.auditLogs.unshift(record);
    if (this.db.auditLogs.length > 200) {
      this.db.auditLogs = this.db.auditLogs.slice(0, 200);
    }
    this.saveSync();
    return record;
  }

  public getAuditLogs(): AuditLogRecord[] {
    return [...this.db.auditLogs];
  }

  // Sessions
  public createSession(userId: string, token: string): SessionRecord {
    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const session: SessionRecord = {
      token,
      userId,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };

    // Remove expired sessions
    this.db.sessions = this.db.sessions.filter(s => new Date(s.expiresAt) > now);
    this.db.sessions.push(session);
    this.saveSync();
    return session;
  }

  public getSession(token: string): SessionRecord | undefined {
    const session = this.db.sessions.find(s => s.token === token);
    if (session && new Date(session.expiresAt) < new Date()) {
      this.deleteSession(token);
      return undefined;
    }
    return session;
  }

  public deleteSession(token: string) {
    this.db.sessions = this.db.sessions.filter(s => s.token !== token);
    this.saveSync();
  }

  // Usage Management (Atomic Server Check & Log)
  public getUserDailyCount(userId: string, dateStr: string): number {
    return this.db.usageLogs.filter(
      u => u.userId === userId && u.dateStr === dateStr && u.status === 'success'
    ).length;
  }

  public getUserMonthlyCount(userId: string, monthStr: string): number {
    return this.db.usageLogs.filter(
      u => u.userId === userId && u.monthStr === monthStr && u.status === 'success'
    ).length;
  }

  public logUsage(
    userId: string,
    model: string,
    status: 'success' | 'error',
    errorMessage?: string,
    telemetry?: { ttftMs?: number; totalMs?: number; inputChars?: number; outputChars?: number }
  ): UsageRecord {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const monthStr = dateStr.substring(0, 7);

    const record: UsageRecord = {
      id: `usg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      model,
      timestamp: now.toISOString(),
      dateStr,
      monthStr,
      status,
      errorMessage,
      ttftMs: telemetry?.ttftMs,
      totalMs: telemetry?.totalMs,
      inputChars: telemetry?.inputChars,
      outputChars: telemetry?.outputChars,
    };

    this.db.usageLogs.push(record);
    this.saveSync();
    return record;
  }

  public getAllUsageLogs(): UsageRecord[] {
    return [...this.db.usageLogs];
  }

  public getLatencyAnalytics() {
    const logs = this.db.usageLogs;
    if (logs.length === 0) {
      return {
        overallAvgTtftMs: 0,
        overallAvgTotalMs: 0,
        totalRequests: 0,
        successRatePercent: 100,
        modelMetrics: []
      };
    }

    const successfulLogs = logs.filter(l => l.status === 'success' && typeof l.ttftMs === 'number');
    const totalRequests = logs.length;
    const successCount = logs.filter(l => l.status === 'success').length;
    const successRatePercent = totalRequests > 0 ? Math.round((successCount / totalRequests) * 100) : 100;

    const overallAvgTtftMs = successfulLogs.length > 0
      ? Math.round(successfulLogs.reduce((acc, l) => acc + (l.ttftMs || 0), 0) / successfulLogs.length)
      : 0;

    const overallAvgTotalMs = successfulLogs.length > 0
      ? Math.round(successfulLogs.reduce((acc, l) => acc + (l.totalMs || 0), 0) / successfulLogs.length)
      : 0;

    // Model metrics
    const modelGroup: { [key: string]: UsageRecord[] } = {};
    logs.forEach(l => {
      modelGroup[l.model] = modelGroup[l.model] || [];
      modelGroup[l.model].push(l);
    });

    const modelMetrics = Object.keys(modelGroup).map(modelName => {
      const mLogs = modelGroup[modelName];
      const mSucc = mLogs.filter(l => l.status === 'success');
      const mErr = mLogs.filter(l => l.status === 'error');
      const mSuccWithTtft = mSucc.filter(l => typeof l.ttftMs === 'number');

      const avgTtftMs = mSuccWithTtft.length > 0
        ? Math.round(mSuccWithTtft.reduce((acc, l) => acc + (l.ttftMs || 0), 0) / mSuccWithTtft.length)
        : 0;

      const avgTotalMs = mSuccWithTtft.length > 0
        ? Math.round(mSuccWithTtft.reduce((acc, l) => acc + (l.totalMs || 0), 0) / mSuccWithTtft.length)
        : 0;

      const ttftValues = mSuccWithTtft.map(l => l.ttftMs || 0);
      const minTtftMs = ttftValues.length > 0 ? Math.min(...ttftValues) : 0;
      const maxTtftMs = ttftValues.length > 0 ? Math.max(...ttftValues) : 0;

      const totalInputChars = mLogs.reduce((acc, l) => acc + (l.inputChars || 0), 0);
      const totalOutputChars = mLogs.reduce((acc, l) => acc + (l.outputChars || 0), 0);

      return {
        model: modelName,
        totalRequests: mLogs.length,
        successCount: mSucc.length,
        errorCount: mErr.length,
        avgTtftMs,
        avgTotalMs,
        minTtftMs,
        maxTtftMs,
        totalInputChars,
        totalOutputChars,
      };
    });

    return {
      overallAvgTtftMs,
      overallAvgTotalMs,
      totalRequests,
      successRatePercent,
      modelMetrics,
    };
  }

  // Subscriptions & Payment Transactions
  public addSubscription(userId: string, tier: 'pro' | 'enterprise', amount: number, paymentRef: string): SubscriptionRecord {
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const sub: SubscriptionRecord = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      tier,
      status: 'active',
      amount,
      paymentRef,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };

    this.db.subscriptions.push(sub);
    this.updateUserTier(userId, tier, 30);
    this.saveSync();
    return sub;
  }

  public getSubscriptionsForUser(userId: string): SubscriptionRecord[] {
    return this.db.subscriptions.filter(s => s.userId === userId);
  }

  public getAllSubscriptions(): SubscriptionRecord[] {
    return [...this.db.subscriptions];
  }
}

export const db = new PersistentDatabase();

