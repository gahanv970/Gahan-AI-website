export type SecurityAgentId =
  | 'web_security'
  | 'network_security'
  | 'vulnerability_intel'
  | 'threat_detection'
  | 'security_audit'
  | 'secure_code'
  | 'orchestrator';

export type FindingConfidenceCategory = 'confirmed' | 'potential' | 'informational';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AIProviderType = 'ollama' | 'gemini';

export interface FindingEvidence {
  sourceType: 'code' | 'log' | 'config' | 'header' | 'network' | 'cve';
  location?: string; // e.g. "src/auth/login.ts:42" or "access.log line 152"
  rawExcerpt: string; // The exact code, log line, or config setting
  explanation: string; // Why this excerpt constitutes evidence
}

export interface SecurityFinding {
  id: string;
  agentId: SecurityAgentId;
  title: string;
  category: FindingConfidenceCategory; // confirmed vs potential vs informational
  severity: SeverityLevel;
  cvssScore?: number; // e.g., 8.5 (verified/authentic CVSS if available, never fabricated)
  cveId?: string; // Real CVE ID if matched
  cweId?: string; // CWE classification e.g., "CWE-79"
  description: string;
  evidence: FindingEvidence[];
  remediation: {
    explanation: string;
    suggestedCode?: string;
    preventionSteps: string[];
  };
}

export interface ScopeAuthorization {
  isAuthorized: boolean;
  targetScope: string; // e.g., "Internal repository / local test logs"
  confirmedByUser: boolean;
  timestamp: string;
  disruptiveActionsBlocked: boolean; // Always true
}

export interface AIProviderConfig {
  provider: AIProviderType;
  ollamaEndpoint: string; // Default: "http://localhost:11434"
  ollamaModel: string; // Default: "qwen3:1.7b"
  geminiModel: string; // Default: "gemini-3.8-flash"
  useFallback: boolean;
  localOnly?: boolean; // When true, strictly disables fallback to cloud Gemini
  strictLocalOnly?: boolean; // Alias for localOnly
}

export interface AgentExecutionInput {
  userPrompt: string;
  sourceCode?: string;
  logs?: string;
  configFiles?: string;
  targetScope?: ScopeAuthorization;
  providerConfig?: AIProviderConfig;
  authToken?: string;
  activeScanRequested?: boolean;
}

export interface AgentExecutionResult {
  id: string;
  agentId: SecurityAgentId;
  timestamp: string;
  findings: SecurityFinding[];
  rawText: string;
  providerUsed: 'ollama' | 'gemini' | 'simulated';
  scopeValid: boolean;
  warnings?: string[];
}

export interface SecurityAgentMetadata {
  id: SecurityAgentId;
  name: string;
  tagline: string;
  description: string;
  iconName: string;
  capabilities: string[];
  sampleInputs: string[];
  badgeColor: string;
}

export interface AgentExecutionStep {
  id: string;
  agentId: SecurityAgentId;
  status: 'pending' | 'running' | 'completed' | 'failed';
  stepName: string;
  message: string;
  timestamp: string;
  findingsCount?: number;
  durationMs?: number;
  error?: string;
}

export interface AgentExecutionFailure {
  agentId: SecurityAgentId;
  stepName: string;
  errorMessage: string;
  errorType: string;
  timestamp: string;
  durationMs?: number;
}

export interface FindingConflict {
  findingId: string;
  title: string;
  agentIds: SecurityAgentId[];
  differingSeverities?: SeverityLevel[];
  differingCategories?: FindingConfidenceCategory[];
  resolution: string;
}

export interface PrioritizedRemediation {
  priority: 'immediate' | 'high' | 'routine';
  title: string;
  action: string;
  associatedFindings: string[];
}

export interface ExecutedAgentSummary {
  agentId: SecurityAgentId;
  name: string;
  status: 'completed' | 'failed' | 'skipped';
  durationMs: number;
  findingsCount: number;
  error?: string;
}

export interface OrchestratorAnalysisResult {
  id: string;
  timestamp: string;
  scope: ScopeAuthorization;
  providerUsed: AIProviderConfig;
  investigationSummary?: string;
  agentsExecuted?: ExecutedAgentSummary[];
  summary: {
    totalFindings: number;
    confirmedCount: number;
    potentialCount: number;
    informationalCount: number;
    severityBreakdown: Record<SeverityLevel, number>;
  };
  steps: AgentExecutionStep[];
  findings: SecurityFinding[];
  conflicts?: FindingConflict[];
  failures?: AgentExecutionFailure[];
  limitationsAndIncompleteChecks?: string[];
  recommendedRemediations?: PrioritizedRemediation[];
  rawAgentOutputs: Record<SecurityAgentId, string>;
  executiveSummaryMarkdown: string;
}

export interface SyntheticSecurityDataset {
  id: string;
  agentId: SecurityAgentId;
  title: string;
  tagline: string;
  description: string;
  category: 'web' | 'network' | 'vulnerability' | 'threat' | 'audit' | 'code';
  tags: string[];
  inputs: {
    userPrompt: string;
    sourceCode?: string;
    logs?: string;
    configFiles?: string;
  };
  expectedFindings: SecurityFinding[];
  demoSimulatedResult: AgentExecutionResult;
  metadata: {
    isSynthetic: true;
    license: string;
    containsCredentials: false;
    version: string;
    safeForDemo: true;
  };
}

export interface DatasetValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}


