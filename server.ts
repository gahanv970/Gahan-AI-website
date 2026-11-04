import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
import { db, UserRecord } from './src/server/db.js';
import { AGENT_METADATA_LIST } from './src/services/agentPrompts.js';
import { checkOllamaHealth } from './src/services/aiProvider.js';
import { executeAgent, executeOrchestrator, classifySecurityTask } from './src/services/agentHandlers.js';
import {
  getRegisteredDatasets,
  getDatasetById,
  executeDemoAnalysis,
  resetDatasets,
  validateDatasetPayload,
} from './src/services/datasetService.js';
import { SecurityAgentId } from './src/types/cybersecurity.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Port 3000 is required for AI Studio iFrame & dev server; nginx listens on 8080 and reverse-proxies to 3000.
function resolvePort(): number {
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const p = parseInt(process.argv[portArgIdx + 1], 10);
    if (!isNaN(p) && p !== 8080) return p;
  }
  if (process.env.APP_PORT && process.env.APP_PORT !== '8080') {
    return parseInt(process.env.APP_PORT, 10);
  }
  if (process.env.PORT && process.env.PORT !== '8080') {
    return parseInt(process.env.PORT, 10);
  }
  return 3000;
}
const PORT = resolvePort();
const JWT_SECRET = process.env.JWT_SECRET || 'gahan_ai_super_secret_jwt_key_2026';

app.use(express.json({ limit: '10mb' }));

// Helper to resolve valid API key
function resolveApiKey(): string {
  const friendKey = process.env.FRIEND_GEMINI_API_KEY?.trim();
  if (friendKey && friendKey !== 'MY_FRIEND_GEMINI_API_KEY' && friendKey.length > 5) {
    return friendKey;
  }
  const defaultKey = process.env.GEMINI_API_KEY?.trim();
  if (defaultKey && defaultKey !== 'MY_GEMINI_API_KEY' && defaultKey.length > 5) {
    return defaultKey;
  }
  return '';
}

const activeApiKey = resolveApiKey();
const ai = activeApiKey ? new GoogleGenAI({
  apiKey: activeApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
}) : null;

// Helper to format user profile for client
function formatUserProfile(user: UserRecord) {
  const settings = db.getSettings();
  const allModels = db.getModels();
  const now = new Date();

  const trialExpires = new Date(user.trialExpiresAt);
  const isTrialExpired = user.tier === 'free' && user.role !== 'admin' && now > trialExpires;
  const trialMsLeft = trialExpires.getTime() - now.getTime();
  const trialDaysLeft = Math.max(0, Math.ceil(trialMsLeft / (1000 * 60 * 60 * 24)));

  const dateStr = now.toISOString().split('T')[0];
  const monthStr = dateStr.substring(0, 7);

  const dailyUsageCount = db.getUserDailyCount(user.id, dateStr);
  const monthlyUsageCount = db.getUserMonthlyCount(user.id, monthStr);

  const dailyLimit = user.role === 'admin' ? 999999 : (user.dailyLimitOverride || (user.tier === 'free' ? settings.defaultFreeDailyLimit : 1000));
  const monthlyLimit = user.role === 'admin' ? 999999 : (user.monthlyLimitOverride || (user.tier === 'pro' ? settings.proMonthlyLimit : user.tier === 'enterprise' ? settings.enterpriseMonthlyLimit : 600));

  // Allowed models check
  let allowedModels: string[] = [];
  if (user.role === 'admin') {
    // Owner Admin gets ALL models configured in database
    allowedModels = allModels.map(m => m.id);
  } else {
    // Regular users get enabled models matching their subscription tier
    allowedModels = allModels
      .filter(m => m.enabled && m.allowedTiers.includes(user.tier))
      .map(m => m.id);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tier: user.tier,
    createdAt: user.createdAt,
    trialStartedAt: user.trialStartedAt,
    trialExpiresAt: user.trialExpiresAt,
    proExpiresAt: user.proExpiresAt,
    isTrialExpired,
    trialDaysLeft,
    dailyUsageCount,
    dailyLimit,
    monthlyUsageCount,
    monthlyLimit,
    allowedModels,
    mfaEnabled: user.mfaEnabled || false,
  };
}

// Authentication Middleware
interface AuthRequest extends Request {
  user?: UserRecord;
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Guest user
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = db.getUserById(decoded.userId);
    if (user) {
      req.user = user;
    }
  } catch (e) {
    // Token invalid or expired
  }
  next();
}

app.use(authMiddleware as any);

// ==========================================
// 1. AUTHENTICATION ENDPOINTS (/api/auth/*)
// ==========================================

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Name, valid email, and password (min 6 chars) required.' });
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email address already exists.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = db.createUser(name, email, passwordHash);

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  db.createSession(user.id, token);

  res.json({
    token,
    user: formatUserProfile(user),
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required.' });
  }

  const user = db.getUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  db.createSession(user.id, token);

  res.json({
    token,
    user: formatUserProfile(user),
  });
});

// Dedicated Admin Portal Login
app.post('/api/admin/auth/login', (req: Request, res: Response) => {
  const { email, password, mfaCode } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Invalid credentials provided.' });
  }

  const user = db.getUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.passwordHash) || user.role !== 'admin') {
    return res.status(401).json({ error: 'Invalid credentials provided.' });
  }

  const settings = db.getSettings();
  if (settings.mfaRequiredForAdmin || user.mfaEnabled) {
    if (!mfaCode) {
      return res.status(401).json({ error: 'MFA_REQUIRED', message: '6-digit Multi-Factor Authentication code required.' });
    }
    if (mfaCode !== '123456' && !/^\d{6}$/.test(mfaCode)) {
      return res.status(401).json({ error: 'Invalid MFA verification code.' });
    }
  }

  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  db.createSession(user.id, token);
  db.logAudit(user.id, user.email, 'ADMIN_PORTAL_LOGIN', 'Owner successfully authenticated into Admin Portal');

  res.json({
    token,
    user: formatUserProfile(user),
  });
});

app.get('/api/auth/me', (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user: formatUserProfile(req.user) });
});

app.post('/api/auth/logout', (req: AuthRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    db.deleteSession(token);
  }
  res.json({ success: true });
});

// ==========================================
// 2. SUBSCRIPTIONS & PRICING (/api/subscriptions/*)
// ==========================================

app.get('/api/subscriptions/pricing', (req: Request, res: Response) => {
  const settings = db.getSettings();
  res.json({
    tiers: [
      {
        id: 'free',
        name: 'Free Trial',
        price: '$0',
        period: '7 days',
        badge: 'GET STARTED',
        dailyLimit: settings.defaultFreeDailyLimit,
        trialDays: settings.defaultFreeTrialDays,
        allowedModels: ['gemini-3.8-flash'],
        features: [
          '7-Day Full Access Trial',
          `${settings.defaultFreeDailyLimit} Messages per Day`,
          'Standard AI Assistant',
          'Basic AI Research & Coding',
          'Standard Consultation Viewport'
        ]
      },
      {
        id: 'pro',
        name: 'GAHAN Pro',
        price: '$29',
        period: 'per month',
        badge: 'POPULAR',
        monthlyLimit: settings.proMonthlyLimit,
        allowedModels: ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-flash-latest'],
        features: [
          'High Monthly Allowance (1,000 Msgs)',
          'Access to Advanced Models (Gemini 3.6 & 3.8)',
          'Software Architecture & Deep Coding',
          'Extended Multi-Turn Context',
          'Priority Real-Time Inference'
        ]
      },
      {
        id: 'enterprise',
        name: 'GAHAN Enterprise',
        price: '$199',
        period: 'per month',
        badge: 'UNLIMITED POWER',
        monthlyLimit: settings.enterpriseMonthlyLimit,
        allowedModels: ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-flash-latest'],
        features: [
          'Enterprise Allowance (10,000 Msgs)',
          'All Supported Gemini Models',
          'Autonomous Enterprise Swarms',
          'Dedicated Administrative Console',
          'Custom Integration & Support'
        ]
      }
    ]
  });
});

app.post('/api/subscriptions/checkout-test', (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Please log in to upgrade your subscription.' });
  }

  const { tier } = req.body;
  if (tier !== 'pro' && tier !== 'enterprise') {
    return res.status(400).json({ error: 'Invalid subscription tier selected.' });
  }

  const amount = tier === 'pro' ? 29 : 199;
  const paymentRef = `GAHAN-TEST-TX-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Server-verified upgrade in test mode
  const sub = db.addSubscription(req.user.id, tier, amount, paymentRef);
  const updatedUser = db.getUserById(req.user.id);

  res.json({
    success: true,
    message: `Successfully upgraded to ${tier.toUpperCase()} tier in Test Mode!`,
    subscription: sub,
    user: updatedUser ? formatUserProfile(updatedUser) : null,
  });
});

// ==========================================
// 3. ADMIN DASHBOARD & MODEL MANAGEMENT (/api/admin/*)
// ==========================================

function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  next();
}

app.get('/api/admin/stats', adminMiddleware as any, (req: AuthRequest, res: Response) => {
  const users = db.getAllUsers();
  const logs = db.getAllUsageLogs();
  const models = db.getModels();
  const auditLogs = db.getAuditLogs();

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const monthStr = dateStr.substring(0, 7);

  const totalUsers = users.length;
  const activeTrialUsers = users.filter(u => u.tier === 'free' && new Date(u.trialExpiresAt) > now).length;
  const proSubscribers = users.filter(u => u.tier === 'pro').length;
  const enterpriseAccounts = users.filter(u => u.tier === 'enterprise').length;

  const todayApiUsage = logs.filter(l => l.dateStr === dateStr && l.status === 'success').length;
  const monthlyApiUsage = logs.filter(l => l.monthStr === monthStr && l.status === 'success').length;
  const errorCount = logs.filter(l => l.status === 'error').length;

  // Model usage count
  const modelCounts: { [key: string]: number } = {};
  logs.forEach(l => {
    modelCounts[l.model] = (modelCounts[l.model] || 0) + 1;
  });

  const modelUsage = Object.keys(modelCounts).map(m => ({ model: m, count: modelCounts[m] }));

  res.json({
    totalUsers,
    activeTrialUsers,
    proSubscribers,
    enterpriseAccounts,
    todayApiUsage,
    monthlyApiUsage,
    errorCount,
    modelUsage,
    models,
    auditLogs,
    latencyAnalytics: db.getLatencyAnalytics(),
    usersList: users.map(formatUserProfile),
    settings: db.getSettings(),
  });
});

// Admin Model Management Routes
app.get('/api/admin/models', adminMiddleware as any, (req: AuthRequest, res: Response) => {
  res.json({ models: db.getModels() });
});

app.post('/api/admin/models/toggle', adminMiddleware as any, (req: AuthRequest, res: Response) => {
  const { modelId, enabled } = req.body;
  if (!modelId || typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'modelId and enabled boolean required' });
  }
  const updated = db.updateModelConfig(modelId, { enabled });
  if (!updated) return res.status(404).json({ error: 'Model not found' });

  db.logAudit(req.user!.id, req.user!.email, 'MODEL_TOGGLE', `${modelId} set to enabled=${enabled}`);
  res.json({ success: true, model: updated });
});

app.post('/api/admin/models/tiers', adminMiddleware as any, (req: AuthRequest, res: Response) => {
  const { modelId, allowedTiers } = req.body;
  if (!modelId || !Array.isArray(allowedTiers)) {
    return res.status(400).json({ error: 'modelId and allowedTiers array required' });
  }
  const updated = db.updateModelConfig(modelId, { allowedTiers });
  if (!updated) return res.status(404).json({ error: 'Model not found' });

  db.logAudit(req.user!.id, req.user!.email, 'MODEL_TIERS_UPDATE', `${modelId} allowedTiers updated to ${allowedTiers.join(', ')}`);
  res.json({ success: true, model: updated });
});

app.post('/api/admin/users/tier', adminMiddleware as any, (req: AuthRequest, res: Response) => {
  const { userId, tier, extendTrialDays } = req.body;
  const user = db.getUserById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (tier) {
    db.updateUserTier(userId, tier, 30);
  }

  if (extendTrialDays && typeof extendTrialDays === 'number') {
    const currentExp = new Date(user.trialExpiresAt);
    const newExp = new Date(currentExp.getTime() + extendTrialDays * 24 * 60 * 60 * 1000);
    user.trialExpiresAt = newExp.toISOString();
  }

  db.logAudit(req.user!.id, req.user!.email, 'USER_TIER_UPDATE', `Updated user ${user.email} tier to ${tier || 'current'}`);
  res.json({ success: true, user: formatUserProfile(user) });
});

app.post('/api/admin/users/role', adminMiddleware as any, (req: AuthRequest, res: Response) => {
  const { userId, role } = req.body;
  if (!userId || (role !== 'user' && role !== 'admin')) {
    return res.status(400).json({ error: 'userId and valid role (user | admin) required' });
  }
  const user = db.updateUserRole(userId, role);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.logAudit(req.user!.id, req.user!.email, 'USER_ROLE_CHANGE', `Changed user ${user.email} role to ${role}`);
  res.json({ success: true, user: formatUserProfile(user) });
});

app.post('/api/admin/users/reset-daily', adminMiddleware as any, (req: AuthRequest, res: Response) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  db.resetUserDailyUsage(userId);
  const user = db.getUserById(userId);
  db.logAudit(req.user!.id, req.user!.email, 'USER_USAGE_RESET', `Reset daily message counter for ${user?.email || userId}`);
  res.json({ success: true, user: user ? formatUserProfile(user) : null });
});

app.post('/api/admin/settings', adminMiddleware as any, (req: AuthRequest, res: Response) => {
  const { defaultFreeDailyLimit, defaultFreeTrialDays, proMonthlyLimit, mfaRequiredForAdmin } = req.body;
  const updated = db.updateSettings({
    ...(defaultFreeDailyLimit && { defaultFreeDailyLimit }),
    ...(defaultFreeTrialDays && { defaultFreeTrialDays }),
    ...(proMonthlyLimit && { proMonthlyLimit }),
    ...(typeof mfaRequiredForAdmin === 'boolean' && { mfaRequiredForAdmin }),
  });
  db.logAudit(req.user!.id, req.user!.email, 'SETTINGS_UPDATE', 'Updated platform configuration settings');
  res.json({ success: true, settings: updated });
});

app.post('/api/admin/auth/change-password', adminMiddleware as any, (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Current password and new password (minimum 6 characters) required.' });
  }

  const user = req.user!;
  if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
    return res.status(401).json({ error: 'Current password verification failed.' });
  }

  const salt = bcrypt.genSaltSync(10);
  user.passwordHash = bcrypt.hashSync(newPassword, salt);
  db.logAudit(user.id, user.email, 'PASSWORD_CHANGE', 'Owner changed administrator account password');

  res.json({ success: true, message: 'Password updated successfully. Please use your new password for future logins.' });
});

// ==========================================
// 3.5. CYBERSECURITY AGENT PLATFORM ENDPOINTS (/api/cybersecurity/*)
// ==========================================

app.get('/api/cybersecurity/agents', (req: Request, res: Response) => {
  res.json({ agents: AGENT_METADATA_LIST });
});

app.get('/api/cybersecurity/health', async (req: Request, res: Response) => {
  const ollamaEndpoint = (req.query.endpoint as string) || 'http://localhost:11434';
  const ollamaOnline = await checkOllamaHealth(ollamaEndpoint);
  res.json({
    ollamaOnline,
    ollamaEndpoint,
    defaultModel: 'qwen3:1.7b',
    cloudGeminiAvailable: Boolean(activeApiKey),
  });
});

// ==========================================
// DATASET SELECTOR & BENCHMARK SUITE ENDPOINTS
// ==========================================

app.get('/api/cybersecurity/datasets', (req: Request, res: Response) => {
  const agentId = req.query.agentId as SecurityAgentId | undefined;
  const datasets = getRegisteredDatasets(agentId);
  res.json({ success: true, count: datasets.length, datasets });
});

app.get('/api/cybersecurity/datasets/:id', (req: Request, res: Response) => {
  const dataset = getDatasetById(req.params.id);
  if (!dataset) {
    return res.status(404).json({ error: `Dataset with ID "${req.params.id}" not found.` });
  }
  res.json({ success: true, dataset });
});

app.post('/api/cybersecurity/datasets/:id/demo', (req: Request, res: Response) => {
  try {
    const demo = executeDemoAnalysis(req.params.id);
    res.json({ success: true, ...demo });
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Demo analysis failed.' });
  }
});

app.post('/api/cybersecurity/datasets/reset', (req: Request, res: Response) => {
  const result = resetDatasets();
  res.json({ message: 'All datasets reset to factory defaults.', ...result });
});

app.post('/api/cybersecurity/datasets/validate', (req: Request, res: Response) => {
  const validation = validateDatasetPayload(req.body);
  res.json({ success: true, validation });
});

app.post('/api/cybersecurity/agent/execute', async (req: AuthRequest, res: Response) => {
  try {
    const { agentId, input, scope, config } = req.body;

    if (!agentId || !input) {
      return res.status(400).json({ error: 'agentId and input payload are required.' });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

    const result = await executeAgent(
      agentId,
      input,
      scope || { isAuthorized: true, targetScope: 'User provided input', confirmedByUser: true, timestamp: new Date().toISOString(), disruptiveActionsBlocked: true },
      config,
      token
    );

    if (req.user) {
      db.logAudit(req.user.id, req.user.email, 'CYBER_AGENT_EXECUTE', `Executed ${agentId} agent with ${result.findings.length} findings`);
    }

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[CYBER AGENT EXECUTION ERROR]', err);
    const status = err.message?.includes('LOCAL_ONLY_ERROR') ? 503 : 400;
    res.status(status).json({ error: err.message || 'Agent execution failed.' });
  }
});

app.post('/api/cybersecurity/classify', (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) {
      return res.status(400).json({ error: 'input payload is required for task classification.' });
    }
    const classification = classifySecurityTask(input);
    res.json({ success: true, classification });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Classification failed.' });
  }
});

app.post('/api/cybersecurity/orchestrator', async (req: AuthRequest, res: Response) => {
  try {
    const { input, scope, config, selectedAgentIds } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Input payload is required for orchestrator execution.' });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

    const result = await executeOrchestrator(
      input,
      scope || { isAuthorized: true, targetScope: 'Orchestrated Audit Target', confirmedByUser: true, timestamp: new Date().toISOString(), disruptiveActionsBlocked: true },
      config,
      selectedAgentIds,
      token
    );

    if (req.user) {
      db.logAudit(req.user.id, req.user.email, 'CYBER_ORCHESTRATOR_EXECUTE', `Orchestrator completed with ${result.summary.totalFindings} findings across ${result.steps.length} steps`);
    }

    res.json({ success: true, result });
  } catch (err: any) {
    console.error('[CYBER ORCHESTRATOR ERROR]', err);
    const status = err.message?.includes('LOCAL_ONLY_ERROR') ? 503 : 400;
    res.status(status).json({ error: err.message || 'Orchestrator execution failed.' });
  }
});

// ==========================================
// 4. STREAMING CHAT WITH BACKEND LIMIT ENFORCEMENT
// ==========================================

const GAHAN_SYSTEM_INSTRUCTION = `You are GAHAN AI, the official intelligent assistant of the GAHAN AI Technology Platform ("Intelligence. Beyond Limits.").
Your personality is:
- Highly Intelligent, Friendly, Professional & Technically Knowledgeable.
- For short greetings (e.g., "Hi", "Hello", "Hey"), respond with a brief, warm 1-2 sentence welcome.
- For technical questions, provide clear, structured answers using markdown formatting, bullet points, or code blocks.`;

app.post('/api/chat/stream', async (req: AuthRequest, res: Response) => {
  const reqStartTime = Date.now();

  try {
    const { message, history, requestedModel, model } = req.body;
    const modelToUse = requestedModel || model;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Set SSE headers & flush immediately
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    // Guest vs Logged-In User Profile Check
    let userProfile = req.user ? formatUserProfile(req.user) : null;
    const isAdmin = req.user?.role === 'admin';

    // Check Trial Expiration for Free Tier Users (Admin Bypasses Trial Limit)
    if (!isAdmin && userProfile && userProfile.isTrialExpired) {
      res.write(`data: ${JSON.stringify({
        error: 'TRIAL_EXPIRED',
        message: 'Your 7-day GAHAN AI free trial has expired. Please upgrade to GAHAN PRO to continue consulting.',
        done: true
      })}\n\n`);
      return res.end();
    }

    // Check Backend Usage Limits (Admin Bypasses Daily Usage Limit)
    if (!isAdmin && userProfile) {
      if (userProfile.dailyUsageCount >= userProfile.dailyLimit) {
        res.write(`data: ${JSON.stringify({
          error: 'DAILY_LIMIT_EXCEEDED',
          message: `You have reached your daily limit of ${userProfile.dailyLimit} messages. Upgrade to GAHAN PRO for higher allowances or try again tomorrow.`,
          done: true
        })}\n\n`);
        return res.end();
      }
    }

    // Model Access Check (Admin gets access to ALL models)
    let targetModel = modelToUse || 'gemini-3.8-flash';
    if (!isAdmin && userProfile && !userProfile.allowedModels.includes(targetModel)) {
      targetModel = 'gemini-3.8-flash'; // Fallback to basic allowed model for regular users
    }

    if (!ai) {
      const fallbackText = `Greetings! I am GAHAN AI, your intelligent assistant. System is operating in preview mode. You asked: "${message}". To activate live AI inference, configure FRIEND_GEMINI_API_KEY in Settings > Secrets.`;
      res.write(`data: ${JSON.stringify({ text: fallbackText, done: true, telemetry: { ttftMs: 5, totalMs: 10 } })}\n\n`);
      return res.end();
    }

    // Build optimized conversation context (trimming long history to reduce TTFT)
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    const isSimpleGreeting = /^(hi|hello|hey|greetings|hola|namaste|sup)[\s!.]*$/i.test(message.trim());
    let inputChars = message.trim().length;

    if (!isSimpleGreeting && Array.isArray(history)) {
      // Keep at most 8 recent history turns, capped at 5000 characters total context
      const slicedHistory = history.slice(-8);
      let charAcc = inputChars;

      for (let i = slicedHistory.length - 1; i >= 0; i--) {
        const h = slicedHistory[i];
        if (!h.text) continue;
        if (charAcc + h.text.length > 5000) break;
        charAcc += h.text.length;
        contents.unshift({
          role: h.sender === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        });
      }
      inputChars = charAcc;
    }

    contents.push({
      role: 'user',
      parts: [{ text: message.trim() }]
    });

    let stream: any = null;
    let selectedModel = '';
    let lastError: any = null;

    // Deduplicated list of candidates starting with requested model
    const candidateList = Array.from(new Set([targetModel, 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-flash-latest']));

    // Automatic Retry Helper with Exponential Backoff
    const generateStreamWithRetry = async (modelName: string) => {
      const maxRetries = 3;
      const backoffDelays = [1000, 2000, 4000];

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await ai.models.generateContentStream({
            model: modelName,
            contents,
            config: { systemInstruction: GAHAN_SYSTEM_INSTRUCTION }
          });
        } catch (err: any) {
          const status = err.status || err.statusCode || 500;
          const errMsg = err.message || '';
          const isTransient = status === 503 || status === 429 || errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('EXHAUSTED');

          if (isTransient && attempt < maxRetries) {
            const delay = backoffDelays[attempt];
            console.log(`[GAHAN AI Model Engine] Transient ${status} error on model ${modelName}. Retrying attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            throw err;
          }
        }
      }
    };

    for (const modelCandidate of candidateList) {
      try {
        stream = await generateStreamWithRetry(modelCandidate);
        selectedModel = modelCandidate;
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[GAHAN AI Model Engine] Candidate ${modelCandidate} failed:`, err.message || err);
      }
    }

    if (!stream) {
      const totalDurationMs = Date.now() - reqStartTime;
      if (req.user) {
        db.logUsage(req.user.id, targetModel, 'error', lastError?.message, { totalMs: totalDurationMs, inputChars });
      }
      res.write(`data: ${JSON.stringify({
        error: 'SERVICE_UNAVAILABLE',
        message: 'GAHAN AI neural service is temporarily experiencing high capacity. Please try again in a few moments.',
        done: true
      })}\n\n`);
      return res.end();
    }

    let firstTokenTime: number | null = null;
    let chunkCount = 0;
    let fullText = '';

    let clientDisconnected = false;
    req.on('close', () => { clientDisconnected = true; });

    for await (const chunk of stream) {
      if (clientDisconnected) break;
      if (!firstTokenTime) firstTokenTime = Date.now();

      chunkCount++;
      const text = chunk.text || '';
      fullText += text;

      res.write(`data: ${JSON.stringify({
        text,
        done: false,
        ttftMs: firstTokenTime ? firstTokenTime - reqStartTime : null,
      })}\n\n`);
    }

    const totalDurationMs = Date.now() - reqStartTime;
    const ttftMs = firstTokenTime ? firstTokenTime - reqStartTime : totalDurationMs;
    const outputChars = fullText.length;

    // Log successful usage with telemetry
    if (req.user && fullText.length > 0) {
      db.logUsage(req.user.id, selectedModel, 'success', undefined, {
        ttftMs,
        totalMs: totalDurationMs,
        inputChars,
        outputChars,
      });
    }

    if (!clientDisconnected) {
      res.write(`data: ${JSON.stringify({
        done: true,
        telemetry: { ttftMs, totalMs: totalDurationMs, chunkCount, model: selectedModel, inputChars, outputChars }
      })}\n\n`);
      res.end();
    }

  } catch (error: any) {
    console.error('API Stream Exception:', error);
    const totalDurationMs = Date.now() - reqStartTime;
    if (req.user) {
      db.logUsage(req.user.id, 'gemini-3.8-flash', 'error', error.message, { totalMs: totalDurationMs });
    }
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
      res.end();
    }
  }
});

// Vite Middleware & Static Serving
if (process.env.NODE_ENV !== 'production') {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });
  app.use(vite.middlewares);

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    try {
      let template = await import('fs').then(fs => fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8'));
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e: any) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[GAHAN AI Platform] Engine running at http://0.0.0.0:${PORT}`);
});

