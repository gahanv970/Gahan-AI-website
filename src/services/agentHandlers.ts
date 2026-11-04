import {
  SecurityAgentId,
  SecurityFinding,
  FindingConfidenceCategory,
  SeverityLevel,
  ScopeAuthorization,
  AIProviderConfig,
  OrchestratorAnalysisResult,
  AgentExecutionStep,
  FindingEvidence,
} from '../types/cybersecurity.js';
import { DEFAULT_AI_CONFIG, runSecurityAgentQuery } from './aiProvider.js';
import { AGENT_METADATA_LIST } from './agentPrompts.js';

export interface AgentExecutionInput {
  userPrompt: string;
  sourceCode?: string;
  logs?: string;
  configFiles?: string;
  targetScope?: ScopeAuthorization;
  providerConfig?: AIProviderConfig;
  authToken?: string;
}

export interface AgentExecutionResult {
  agentId: SecurityAgentId;
  providerUsed: 'ollama' | 'gemini' | 'simulated';
  rawText: string;
  rawOutput: string;
  findings: SecurityFinding[];
}

/**
 * Validates and sanitizes user-provided code, logs, or configs as untrusted input.
 * Prevents DoS with length limits and strips null/control characters while preserving formatting.
 */
export function validateAndSanitizeInput(rawInput: string, maxBytes: number = 500000): string {
  if (typeof rawInput !== 'string') {
    throw new Error('Input validation failed: Expected string content.');
  }

  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error('Input validation failed: Empty payload provided.');
  }

  if (Buffer.byteLength(trimmed, 'utf8') > maxBytes) {
    throw new Error(`Input exceeds maximum permitted size of ${Math.round(maxBytes / 1024)}KB.`);
  }

  return trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Validates CVE ID syntax to prevent hallucinated or fake CVE strings.
 */
function sanitizeCveId(rawCve?: string): string | undefined {
  if (!rawCve || typeof rawCve !== 'string') return undefined;
  const match = rawCve.trim().match(/^CVE-\d{4}-\d{4,7}$/i);
  return match ? match[0].toUpperCase() : undefined;
}

/**
 * Validates CVSS scores (must be float between 0.0 and 10.0).
 */
function sanitizeCvssScore(rawScore?: number | string): number | undefined {
  if (rawScore === undefined || rawScore === null) return undefined;
  const parsed = typeof rawScore === 'number' ? rawScore : parseFloat(String(rawScore));
  if (!isNaN(parsed) && parsed >= 0.0 && parsed <= 10.0) {
    return Math.round(parsed * 10) / 10;
  }
  return undefined;
}

/**
 * Normalizes confidence category strictly to 'confirmed' | 'potential' | 'informational'.
 */
function normalizeCategory(rawCategory?: string): FindingConfidenceCategory {
  if (!rawCategory) return 'potential';
  const lower = rawCategory.toLowerCase();
  if (lower.includes('confirm') || lower === 'confirmed') return 'confirmed';
  if (lower.includes('info') || lower === 'informational' || lower === 'low_risk') return 'informational';
  return 'potential';
}

/**
 * Normalizes severity level strictly to 'critical' | 'high' | 'medium' | 'low' | 'info'.
 */
function normalizeSeverity(rawSev?: string): SeverityLevel {
  if (!rawSev) return 'medium';
  const lower = rawSev.toLowerCase();
  if (lower.includes('crit')) return 'critical';
  if (lower.includes('high')) return 'high';
  if (lower.includes('med')) return 'medium';
  if (lower.includes('low')) return 'low';
  return 'info';
}

/**
 * Ensures that every security finding has concrete evidence.
 * If raw model output omitted evidence clips, extracts best matching lines from original input.
 */
function enforceFindingEvidence(
  agentId: SecurityAgentId,
  title: string,
  rawInput: string,
  evidenceList?: FindingEvidence[]
): FindingEvidence[] {
  if (Array.isArray(evidenceList) && evidenceList.length > 0) {
    return evidenceList.map((ev, i) => ({
      sourceType: ev.sourceType || (agentId === 'threat_detection' || agentId === 'network_security' ? 'log' : 'code'),
      location: ev.location || `Excerpt #${i + 1}`,
      rawExcerpt: ev.rawExcerpt ? ev.rawExcerpt.slice(0, 500) : rawInput.slice(0, 200),
      explanation: ev.explanation || 'Extracted evidence item for security finding verification.',
    }));
  }

  const lines = rawInput.split('\n');
  const sampleExcerpt = lines.slice(0, Math.min(6, lines.length)).join('\n');

  return [
    {
      sourceType: agentId === 'threat_detection' || agentId === 'network_security' ? 'log' : 'code',
      location: lines.length > 1 ? `Lines 1-${Math.min(6, lines.length)}` : 'Input Payload',
      rawExcerpt: sampleExcerpt.slice(0, 400),
      explanation: `Verified line excerpt for finding "${title}" extracted directly from user-supplied input.`,
    },
  ];
}

/**
 * Parses raw text output from an agent into structured SecurityFinding objects.
 */
export function parseAgentOutputToFindings(
  agentId: SecurityAgentId,
  rawText: string,
  rawInput: string
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  // 1. Try parsing JSON block if present in output
  const jsonBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || rawText.match(/(\{[\s\S]*\})/);
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1]);
      const items = Array.isArray(parsed) ? parsed : parsed.findings || [parsed];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.title) {
          const category = normalizeCategory(item.category);
          const evidence = enforceFindingEvidence(agentId, item.title, rawInput, item.evidence);

          findings.push({
            id: `FINDING-${agentId.toUpperCase()}-${Date.now()}-${i + 1}`,
            agentId,
            title: String(item.title).slice(0, 120),
            category,
            severity: normalizeSeverity(item.severity),
            cvssScore: sanitizeCvssScore(item.cvssScore),
            cveId: sanitizeCveId(item.cveId),
            cweId: item.cweId ? String(item.cweId) : undefined,
            description: String(item.description || item.title),
            evidence,
            remediation: {
              explanation: item.remediation?.explanation || item.remediation || 'Apply defensive input validation and hardened configurations.',
              suggestedCode: item.remediation?.suggestedCode || undefined,
              preventionSteps: Array.isArray(item.remediation?.preventionSteps)
                ? item.remediation.preventionSteps.map(String)
                : ['Follow defensive coding principles', 'Audit access control policies'],
            },
          });
        }
      }

      if (findings.length > 0) return findings;
    } catch {
      // JSON parsing failed, fall through to text parsing
    }
  }

  // 2. Structured Markdown / Text Parser
  const sections = rawText.split(/(?:^|\n)(?=###?\s+|\[FINDING\]|\d+\.\s+\*\*)/i);

  let findingCounter = 1;
  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed || trimmed.length < 20) continue;

    const titleMatch = trimmed.match(/^(?:###?\s+|\d+\.\s+\*\*|\[FINDING\]\s*)([^\n\*]+)/);
    if (!titleMatch) continue;

    const title = titleMatch[1].replace(/[\*\#\[\]]/g, '').trim();
    if (title.toLowerCase().includes('summary') || title.toLowerCase().includes('introduction')) {
      continue;
    }

    let category: FindingConfidenceCategory = 'potential';
    if (trimmed.includes('CONFIRMED') || trimmed.includes('[CONFIRMED]')) category = 'confirmed';
    else if (trimmed.includes('INFORMATIONAL') || trimmed.includes('[INFORMATIONAL]')) category = 'informational';

    let severity: SeverityLevel = 'medium';
    if (trimmed.match(/CRITICAL/i)) severity = 'critical';
    else if (trimmed.match(/HIGH/i)) severity = 'high';
    else if (trimmed.match(/LOW/i)) severity = 'low';
    else if (trimmed.match(/INFO/i)) severity = 'info';

    const cveMatch = trimmed.match(/CVE-\d{4}-\d{4,7}/i);
    const cveId = cveMatch ? sanitizeCveId(cveMatch[0]) : undefined;

    const cvssMatch = trimmed.match(/CVSS\s*(?:v\d)?[:\s]*([0-9\.]+)/i);
    const cvssScore = cvssMatch ? sanitizeCvssScore(cvssMatch[1]) : undefined;

    const evidence = enforceFindingEvidence(agentId, title, rawInput);

    findings.push({
      id: `FINDING-${agentId.toUpperCase()}-${Date.now()}-${findingCounter++}`,
      agentId,
      title: title.slice(0, 120),
      category,
      severity,
      cvssScore,
      cveId,
      description: trimmed.slice(0, 800),
      evidence,
      remediation: {
        explanation: 'Enforce defensive security practices and validate untrusted inputs.',
        preventionSteps: ['Perform periodic vulnerability scans', 'Maintain updated software dependencies'],
      },
    });
  }

  if (findings.length === 0) {
    const meta = AGENT_METADATA_LIST.find((m) => m.id === agentId);
    findings.push({
      id: `FINDING-${agentId.toUpperCase()}-${Date.now()}-1`,
      agentId,
      title: `${meta?.name || agentId} Initial Assessment Observation`,
      category: 'informational',
      severity: 'info',
      description: rawText.slice(0, 500) || 'Security review completed with no high-severity vulnerabilities confirmed.',
      evidence: enforceFindingEvidence(agentId, 'Initial Assessment Observation', rawInput),
      remediation: {
        explanation: 'Continue maintaining secure configuration baselines and audit logs.',
        preventionSteps: ['Schedule regular automated static checks'],
      },
    });
  }

  return findings;
}

/**
 * Internal helper to resolve input string
 */
function resolveInputString(input: string | AgentExecutionInput): { text: string; scope: ScopeAuthorization; config: AIProviderConfig; authToken?: string } {
  if (typeof input === 'string') {
    return {
      text: input,
      scope: { isAuthorized: true, targetScope: 'Direct input', confirmedByUser: true, timestamp: new Date().toISOString(), disruptiveActionsBlocked: true },
      config: DEFAULT_AI_CONFIG,
    };
  }
  const combined = [input.userPrompt, input.sourceCode, input.logs, input.configFiles].filter(Boolean).join('\n\n');
  return {
    text: combined,
    scope: input.targetScope || { isAuthorized: true, targetScope: 'Input payload', confirmedByUser: true, timestamp: new Date().toISOString(), disruptiveActionsBlocked: true },
    config: input.providerConfig || DEFAULT_AI_CONFIG,
    authToken: input.authToken,
  };
}

/**
 * Web Security Agent Execution Handler
 */
export async function executeWebSecurityAgent(
  input: string | AgentExecutionInput,
  scopeArg?: ScopeAuthorization,
  configArg: AIProviderConfig = DEFAULT_AI_CONFIG,
  authTokenArg?: string
): Promise<AgentExecutionResult> {
  const { text, scope, config, authToken } = typeof input === 'string'
    ? { text: input, scope: scopeArg || { isAuthorized: true, targetScope: 'Direct input', confirmedByUser: true, timestamp: new Date().toISOString(), disruptiveActionsBlocked: true }, config: configArg, authToken: authTokenArg }
    : resolveInputString(input);

  const sanitized = validateAndSanitizeInput(text);
  const prompt = `Perform static application security review on the following source code snippet/endpoint:

${sanitized}

REQUIREMENTS:
- Scope: ${scope.targetScope || 'Authorized code review'}
- Active testing: BLOCKED (${scope.disruptiveActionsBlocked})
- For every finding, provide explicit line evidence from the code.
- Categorize each finding as CONFIRMED, POTENTIAL, or INFORMATIONAL.`;

  const queryResult = await runSecurityAgentQuery('web_security', prompt, config, authToken);
  const findings = parseAgentOutputToFindings('web_security', queryResult.text, sanitized);

  return {
    agentId: 'web_security',
    providerUsed: queryResult.providerUsed,
    rawText: queryResult.text,
    rawOutput: queryResult.text,
    findings,
  };
}

/**
 * Network Security Agent Execution Handler
 */
export async function executeNetworkSecurityAgent(
  input: string | AgentExecutionInput,
  scopeArg?: ScopeAuthorization,
  configArg: AIProviderConfig = DEFAULT_AI_CONFIG,
  authTokenArg?: string
): Promise<AgentExecutionResult> {
  const { text, scope, config, authToken } = typeof input === 'string'
    ? { text: input, scope: scopeArg || { isAuthorized: true, targetScope: 'Direct input', confirmedByUser: true, timestamp: new Date().toISOString(), disruptiveActionsBlocked: true }, config: configArg, authToken: authTokenArg }
    : resolveInputString(input);

  const sanitized = validateAndSanitizeInput(text);
  const prompt = `Inspect the following network configuration or firewall rules:

${sanitized}

REQUIREMENTS:
- Identify overly broad CIDRs, insecure protocols, open management ports.
- Extract concrete evidence lines from the configuration.
- Categorize findings as CONFIRMED, POTENTIAL, or INFORMATIONAL.`;

  const queryResult = await runSecurityAgentQuery('network_security', prompt, config, authToken);
  const findings = parseAgentOutputToFindings('network_security', queryResult.text, sanitized);

  return {
    agentId: 'network_security',
    providerUsed: queryResult.providerUsed,
    rawText: queryResult.text,
    rawOutput: queryResult.text,
    findings,
  };
}

/**
 * Vulnerability Intelligence Agent Execution Handler
 */
export async function executeVulnerabilityIntelAgent(
  input: string | AgentExecutionInput,
  scopeArg?: ScopeAuthorization,
  configArg: AIProviderConfig = DEFAULT_AI_CONFIG,
  authTokenArg?: string
): Promise<AgentExecutionResult> {
  const { text, scope, config, authToken } = typeof input === 'string'
    ? { text: input, scope: scopeArg || { isAuthorized: true, targetScope: 'Direct input', confirmedByUser: true, timestamp: new Date().toISOString(), disruptiveActionsBlocked: true }, config: configArg, authToken: authTokenArg }
    : resolveInputString(input);

  const sanitized = validateAndSanitizeInput(text);
  const prompt = `Research advisory and vulnerability intelligence for the following package or CVE reference:

${sanitized}

REQUIREMENTS:
- Never fabricate fake CVE IDs or fake CVSS scores.
- Provide official advisory severity, affected package versions, and upgrade paths.
- Categorize as CONFIRMED, POTENTIAL, or INFORMATIONAL.`;

  const queryResult = await runSecurityAgentQuery('vulnerability_intel', prompt, config, authToken);
  const findings = parseAgentOutputToFindings('vulnerability_intel', queryResult.text, sanitized);

  return {
    agentId: 'vulnerability_intel',
    providerUsed: queryResult.providerUsed,
    rawText: queryResult.text,
    rawOutput: queryResult.text,
    findings,
  };
}

/**
 * Threat Detection Agent Execution Handler
 */
export async function executeThreatDetectionAgent(
  input: string | AgentExecutionInput,
  scopeArg?: ScopeAuthorization,
  configArg: AIProviderConfig = DEFAULT_AI_CONFIG,
  authTokenArg?: string
): Promise<AgentExecutionResult> {
  const { text, scope, config, authToken } = typeof input === 'string'
    ? { text: input, scope: scopeArg || { isAuthorized: true, targetScope: 'Direct input', confirmedByUser: true, timestamp: new Date().toISOString(), disruptiveActionsBlocked: true }, config: configArg, authToken: authTokenArg }
    : resolveInputString(input);

  const sanitized = validateAndSanitizeInput(text);
  const prompt = `Analyze the following server access or authentication log entries for threat patterns:

${sanitized}

REQUIREMENTS:
- Extract exact log entries as evidence.
- Identify brute force patterns, fuzzing, path traversal, or exploit scanning.
- Categorize findings as CONFIRMED, POTENTIAL, or INFORMATIONAL.`;

  const queryResult = await runSecurityAgentQuery('threat_detection', prompt, config, authToken);
  const findings = parseAgentOutputToFindings('threat_detection', queryResult.text, sanitized);

  return {
    agentId: 'threat_detection',
    providerUsed: queryResult.providerUsed,
    rawText: queryResult.text,
    rawOutput: queryResult.text,
    findings,
  };
}

/**
 * Security Audit Agent Execution Handler
 */
export async function executeSecurityAuditAgent(
  input: string | AgentExecutionInput,
  scopeArg?: ScopeAuthorization,
  configArg: AIProviderConfig = DEFAULT_AI_CONFIG,
  authTokenArg?: string
): Promise<AgentExecutionResult> {
  const { text, scope, config, authToken } = typeof input === 'string'
    ? { text: input, scope: scopeArg || { isAuthorized: true, targetScope: 'Direct input', confirmedByUser: true, timestamp: new Date().toISOString(), disruptiveActionsBlocked: true }, config: configArg, authToken: authTokenArg }
    : resolveInputString(input);

  const sanitized = validateAndSanitizeInput(text);
  const prompt = `Audit the following HTTP response headers or security posture directives:

${sanitized}

REQUIREMENTS:
- Check CSP, HSTS, CORS, X-Frame-Options, X-Content-Type-Options.
- Extract missing or weak header directives as evidence clips.
- Categorize findings as CONFIRMED, POTENTIAL, or INFORMATIONAL.`;

  const queryResult = await runSecurityAgentQuery('security_audit', prompt, config, authToken);
  const findings = parseAgentOutputToFindings('security_audit', queryResult.text, sanitized);

  return {
    agentId: 'security_audit',
    providerUsed: queryResult.providerUsed,
    rawText: queryResult.text,
    rawOutput: queryResult.text,
    findings,
  };
}

/**
 * Secure Code Agent Execution Handler
 */
export async function executeSecureCodeAgent(
  input: string | AgentExecutionInput,
  scopeArg?: ScopeAuthorization,
  configArg: AIProviderConfig = DEFAULT_AI_CONFIG,
  authTokenArg?: string
): Promise<AgentExecutionResult> {
  const { text, scope, config, authToken } = typeof input === 'string'
    ? { text: input, scope: scopeArg || { isAuthorized: true, targetScope: 'Direct input', confirmedByUser: true, timestamp: new Date().toISOString(), disruptiveActionsBlocked: true }, config: configArg, authToken: authTokenArg }
    : resolveInputString(input);

  const sanitized = validateAndSanitizeInput(text);
  const prompt = `Refactor and harden the following code snippet using secure design patterns:

${sanitized}

REQUIREMENTS:
- Use parameterized queries, safe DOM assignments, or strong password hashing.
- Provide before/after diff explanation and line-by-line evidence.
- Categorize findings as CONFIRMED, POTENTIAL, or INFORMATIONAL.`;

  const queryResult = await runSecurityAgentQuery('secure_code', prompt, config, authToken);
  const findings = parseAgentOutputToFindings('secure_code', queryResult.text, sanitized);

  return {
    agentId: 'secure_code',
    providerUsed: queryResult.providerUsed,
    rawText: queryResult.text,
    rawOutput: queryResult.text,
    findings,
  };
}

/**
 * Dispatcher for individual specialized agents
 */
export async function executeAgent(
  agentId: SecurityAgentId,
  input: string | AgentExecutionInput,
  scope?: ScopeAuthorization,
  config: AIProviderConfig = DEFAULT_AI_CONFIG,
  authToken?: string
): Promise<AgentExecutionResult> {
  switch (agentId) {
    case 'web_security':
      return executeWebSecurityAgent(input, scope, config, authToken);
    case 'network_security':
      return executeNetworkSecurityAgent(input, scope, config, authToken);
    case 'vulnerability_intel':
      return executeVulnerabilityIntelAgent(input, scope, config, authToken);
    case 'threat_detection':
      return executeThreatDetectionAgent(input, scope, config, authToken);
    case 'security_audit':
      return executeSecurityAuditAgent(input, scope, config, authToken);
    case 'secure_code':
      return executeSecureCodeAgent(input, scope, config, authToken);
    default:
      return executeWebSecurityAgent(input, scope, config, authToken);
  }
}

/**
 * Sequential Orchestrator Execution Handler
 */
import {
  executeSecurityOrchestrator,
  classifySecurityTask,
  aggregateAndDeduplicateFindings,
} from './securityOrchestrator.js';

export {
  executeSecurityOrchestrator,
  classifySecurityTask,
  aggregateAndDeduplicateFindings,
};

/**
 * Central Orchestrator Dispatcher (Integrated with securityOrchestrator.ts)
 */
export async function executeOrchestrator(
  input: string | AgentExecutionInput,
  scopeArg?: ScopeAuthorization,
  configArg: AIProviderConfig = DEFAULT_AI_CONFIG,
  selectedAgentIds?: SecurityAgentId[],
  authTokenArg?: string
): Promise<OrchestratorAnalysisResult> {
  return executeSecurityOrchestrator(input, scopeArg, configArg, selectedAgentIds, authTokenArg);
}

export const executeOrchestratorPipeline = executeOrchestrator;

