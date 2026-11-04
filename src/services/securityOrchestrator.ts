import {
  SecurityAgentId,
  SecurityFinding,
  FindingEvidence,
  FindingConfidenceCategory,
  SeverityLevel,
  AgentExecutionInput,
  OrchestratorAnalysisResult,
  AgentExecutionStep,
  AgentExecutionFailure,
  FindingConflict,
  PrioritizedRemediation,
  ExecutedAgentSummary,
  ScopeAuthorization,
  AIProviderConfig,
} from '../types/cybersecurity.js';
import { AGENT_METADATA_LIST } from './agentPrompts.js';
import { DEFAULT_AI_CONFIG } from './aiProvider.js';
import {
  validateAndSanitizeInput,
  executeAgent,
} from './agentHandlers.js';

export interface TaskClassification {
  primaryAgents: SecurityAgentId[];
  detectedDomains: string[];
  rationale: string;
}

/**
 * Classifies incoming cybersecurity requests and input assets to select
 * the appropriate specialized agent(s) based on task relevance.
 */
export function classifySecurityTask(input: string | AgentExecutionInput): TaskClassification {
  let promptText = '';
  let sourceCode = '';
  let logs = '';
  let configFiles = '';

  if (typeof input === 'string') {
    promptText = input;
  } else {
    promptText = input.userPrompt || '';
    sourceCode = input.sourceCode || '';
    logs = input.logs || '';
    configFiles = input.configFiles || '';
  }

  const combinedLower = [promptText, sourceCode, logs, configFiles]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const detectedDomains: string[] = [];
  const selectedAgents: Set<SecurityAgentId> = new Set();

  // 1. Web Security Agent matching
  const hasCodeKeywords =
    sourceCode.length > 0 ||
    /function |const |let |var |import |require\(|class |def |package |public |private /i.test(combinedLower);
  const hasWebVulnKeywords =
    /xss|cross-site|sql injection|sqli|idor|broken access|ssrf|csrf|rce|injection|jwt|session fixation|auth bypass/i.test(
      combinedLower
    );
  if (hasCodeKeywords || hasWebVulnKeywords) {
    selectedAgents.add('web_security');
    detectedDomains.push('Web Application / Static Code Vulnerabilities');
  }

  // 2. Network Security Agent matching
  const hasNetworkKeywords =
    logs.toLowerCase().includes('iptables') ||
    logs.toLowerCase().includes('pfsense') ||
    logs.toLowerCase().includes('firewall') ||
    /iptables|pfsense|firewall|security group|cidr|subnet|port scan|open port|0\.0\.0\.0\/0|ingress rule|egress rule|syn flood/i.test(
      combinedLower
    );
  if (hasNetworkKeywords) {
    selectedAgents.add('network_security');
    detectedDomains.push('Network Architecture & Firewall Rules');
  }

  // 3. Vulnerability Intelligence Agent matching
  const hasCveKeywords =
    /cve-\d{4}-\d{4,8}|nvd|advisory|epss|cwe-|log4j|spring4shell|xz utils|affected package|outdated dependency|vendor patch/i.test(
      combinedLower
    );
  if (hasCveKeywords) {
    selectedAgents.add('vulnerability_intel');
    detectedDomains.push('CVE & Threat Advisory Intelligence');
  }

  // 4. Threat Detection Agent matching
  const hasThreatKeywords =
    logs.length > 0 ||
    /access\.log|auth\.log|audit\.log|syslog|brute force|failed password|401 unauthorized|403 forbidden|dirb|gobuster|nikto|sqlmap|suspicious ip|incident trace/i.test(
      combinedLower
    );
  if (hasThreatKeywords) {
    selectedAgents.add('threat_detection');
    detectedDomains.push('Server Access Logs & Incident Detection');
  }

  // 5. Security Audit Agent matching
  const hasAuditKeywords =
    configFiles.length > 0 ||
    /content-security-policy|csp|hsts|strict-transport-security|cors|access-control-allow|x-frame-options|x-content-type|referrer-policy|spf|dkim|dmarc|dns txt|security headers/i.test(
      combinedLower
    );
  if (hasAuditKeywords) {
    selectedAgents.add('security_audit');
    detectedDomains.push('HTTP Security Headers & Infrastructure Posture');
  }

  // 6. Secure Code Agent matching
  const hasRefactorKeywords =
    /refactor|rewrite|fix code|secure version|parameterized query|dompurify|sanitize|bcrypt|argon2|secure coding|patch/i.test(
      combinedLower
    );
  if (hasRefactorKeywords) {
    selectedAgents.add('secure_code');
    detectedDomains.push('Defensive Code Hardening & Refactoring');
  }

  // If source code or code syntax was provided, pair web security with secure code
  if (sourceCode.length > 0 || hasCodeKeywords) {
    selectedAgents.add('web_security');
    selectedAgents.add('secure_code');
  }

  // Fallback default: If nothing specific was matched, select baseline comprehensive review
  if (selectedAgents.size === 0) {
    selectedAgents.add('web_security');
    selectedAgents.add('security_audit');
    detectedDomains.push('General Cybersecurity Baseline Audit');
  }

  // Sort agents into deterministic, logical pipeline order
  const canonicalOrder: SecurityAgentId[] = [
    'web_security',
    'network_security',
    'vulnerability_intel',
    'threat_detection',
    'security_audit',
    'secure_code',
  ];

  const primaryAgents = canonicalOrder.filter((id) => selectedAgents.has(id));

  return {
    primaryAgents,
    detectedDomains,
    rationale: `Selected ${primaryAgents.length} agent(s) based on detected target signatures: ${detectedDomains.join(
      ', '
    )}.`,
  };
}

/**
 * Compares two findings to evaluate whether they represent the same security issue
 * for deduplication and conflict detection.
 */
function areFindingsOverlapping(a: SecurityFinding, b: SecurityFinding): boolean {
  // If matching real CVE ID
  if (a.cveId && b.cveId && a.cveId.toUpperCase() === b.cveId.toUpperCase()) {
    return true;
  }

  // Normalize titles
  const cleanTitleA = a.title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanTitleB = b.title.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanTitleA === cleanTitleB) return true;

  // Partial substring overlap for common vulnerabilities
  const coreVulns = ['sqlinjection', 'xss', 'idor', 'ssrf', 'csrf', 'hsts', 'csp', 'bruteforce', 'cors'];
  for (const v of coreVulns) {
    if (cleanTitleA.includes(v) && cleanTitleB.includes(v)) {
      return true;
    }
  }

  return false;
}

const SEVERITY_WEIGHTS: Record<SeverityLevel, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

/**
 * Deduplicates overlapping findings across agents and identifies conflicting
 * severity/confidence assessments instead of silently discarding discrepancies.
 */
export function aggregateAndDeduplicateFindings(rawFindings: SecurityFinding[]): {
  deduplicatedFindings: SecurityFinding[];
  conflicts: FindingConflict[];
} {
  const deduplicated: SecurityFinding[] = [];
  const conflicts: FindingConflict[] = [];

  for (const incoming of rawFindings) {
    const existingIndex = deduplicated.findIndex((item) => areFindingsOverlapping(item, incoming));

    if (existingIndex === -1) {
      // Unique finding, store copy
      deduplicated.push({
        ...incoming,
        evidence: [...incoming.evidence],
      });
    } else {
      const existing = deduplicated[existingIndex];

      // Check for conflicts in severity or category
      const severityDiff = existing.severity !== incoming.severity;
      const categoryDiff = existing.category !== incoming.category;

      if (severityDiff || categoryDiff) {
        const higherSeverity =
          SEVERITY_WEIGHTS[incoming.severity] > SEVERITY_WEIGHTS[existing.severity]
            ? incoming.severity
            : existing.severity;

        conflicts.push({
          findingId: existing.id,
          title: existing.title,
          agentIds: Array.from(new Set([existing.agentId, incoming.agentId])),
          differingSeverities: Array.from(new Set([existing.severity, incoming.severity])),
          differingCategories: Array.from(new Set([existing.category, incoming.category])),
          resolution: `Conflict identified between ${existing.agentId} (${existing.severity.toUpperCase()}, ${existing.category}) and ${incoming.agentId} (${incoming.severity.toUpperCase()}, ${incoming.category}). Preserved higher severity (${higherSeverity.toUpperCase()}) for security safety margin while retaining evidence from both agents.`,
        });

        // Resolve finding by adopting higher severity
        existing.severity = higherSeverity;
      }

      // Merge unique evidence items
      for (const ev of incoming.evidence) {
        const isDuplicateExcerpt = existing.evidence.some(
          (e) => e.rawExcerpt.trim() === ev.rawExcerpt.trim() || (e.location && e.location === ev.location)
        );
        if (!isDuplicateExcerpt) {
          existing.evidence.push(ev);
        }
      }

      // Preserve authentic CVSS / CVE if available
      if (!existing.cvssScore && incoming.cvssScore) {
        existing.cvssScore = incoming.cvssScore;
      }
      if (!existing.cveId && incoming.cveId) {
        existing.cveId = incoming.cveId;
      }
      if (!existing.cweId && incoming.cweId) {
        existing.cweId = incoming.cweId;
      }

      // Append complementary remediation steps
      if (incoming.remediation?.suggestedCode && !existing.remediation.suggestedCode) {
        existing.remediation.suggestedCode = incoming.remediation.suggestedCode;
      }
      for (const step of incoming.remediation?.preventionSteps || []) {
        if (!existing.remediation.preventionSteps.includes(step)) {
          existing.remediation.preventionSteps.push(step);
        }
      }
    }
  }

  // Sort deduplicated findings by severity descending (Critical -> High -> Medium -> Low -> Info)
  deduplicated.sort((a, b) => SEVERITY_WEIGHTS[b.severity] - SEVERITY_WEIGHTS[a.severity]);

  return { deduplicatedFindings: deduplicated, conflicts };
}

/**
 * Builds prioritized remediation actions from aggregated findings.
 */
function buildPrioritizedRemediations(findings: SecurityFinding[]): PrioritizedRemediation[] {
  const remediations: PrioritizedRemediation[] = [];

  for (const f of findings) {
    const priority =
      f.severity === 'critical' || f.severity === 'high'
        ? 'immediate'
        : f.severity === 'medium'
        ? 'high'
        : 'routine';

    remediations.push({
      priority,
      title: f.title,
      action: f.remediation.explanation || 'Apply security patch and validate configuration baseline.',
      associatedFindings: [f.id],
    });
  }

  return remediations.slice(0, 8); // Top 8 prioritized actions
}

/**
 * Central Security Orchestrator execution with robust error isolation,
 * sequential delegation, finding aggregation, conflict tracking, and
 * consolidated reporting.
 */
export async function executeSecurityOrchestrator(
  input: string | AgentExecutionInput,
  scopeArg?: ScopeAuthorization,
  configArg: AIProviderConfig = DEFAULT_AI_CONFIG,
  requestedAgentIds?: SecurityAgentId[],
  authTokenArg?: string
): Promise<OrchestratorAnalysisResult> {
  const startTime = new Date();

  // 1. Resolve and validate input
  let rawText = '';
  let enforcedScope: ScopeAuthorization;
  let config: AIProviderConfig = configArg || DEFAULT_AI_CONFIG;
  let authToken = authTokenArg;
  let activeScanRequested = false;

  if (typeof input === 'string') {
    rawText = input;
    enforcedScope = scopeArg || {
      isAuthorized: true,
      targetScope: 'Direct Security Orchestration Query',
      confirmedByUser: true,
      timestamp: startTime.toISOString(),
      disruptiveActionsBlocked: true,
    };
  } else {
    rawText = [input.userPrompt, input.sourceCode, input.logs, input.configFiles].filter(Boolean).join('\n\n');
    enforcedScope = input.targetScope || scopeArg || {
      isAuthorized: true,
      targetScope: 'Submitted Security Orchestrator Payload',
      confirmedByUser: true,
      timestamp: startTime.toISOString(),
      disruptiveActionsBlocked: true,
    };
    config = input.providerConfig || configArg || DEFAULT_AI_CONFIG;
    authToken = input.authToken || authTokenArg;
    activeScanRequested = Boolean(input.activeScanRequested);
  }

  // Always enforce safety: active disruptive testing blocked
  enforcedScope.disruptiveActionsBlocked = true;

  const limitationsAndIncompleteChecks: string[] = [
    'Disruptive active vulnerability exploits and intrusive network fuzzing remain strictly blocked by authorization scope.',
  ];

  // 2. Untrusted input sanitization
  let sanitizedText = '';
  try {
    sanitizedText = validateAndSanitizeInput(rawText);
  } catch (err: any) {
    sanitizedText = 'Empty payload submitted for security audit.';
    limitationsAndIncompleteChecks.push(`Input warning: ${err.message}`);
  }

  // 3. Task classification & agent selection
  let targetAgents: SecurityAgentId[] = [];
  if (requestedAgentIds && requestedAgentIds.length > 0) {
    // Filter out invalid/duplicate requested agents
    targetAgents = Array.from(new Set(requestedAgentIds)).filter((id) => id !== 'orchestrator');
  }

  const classification = classifySecurityTask(typeof input === 'string' ? sanitizedText : input);
  if (targetAgents.length === 0) {
    targetAgents = classification.primaryAgents;
  }

  const steps: AgentExecutionStep[] = [];
  const failures: AgentExecutionFailure[] = [];
  const executedSummaries: ExecutedAgentSummary[] = [];
  const rawAgentOutputs: Record<SecurityAgentId, string> = {
    web_security: '',
    network_security: '',
    vulnerability_intel: '',
    threat_detection: '',
    security_audit: '',
    secure_code: '',
    orchestrator: '',
  };

  const rawFindings: SecurityFinding[] = [];

  // 4. Sequential execution with robust error isolation
  for (const agentId of targetAgents) {
    const meta = AGENT_METADATA_LIST.find((m) => m.id === agentId);
    const agentName = meta?.name || agentId;
    const stepId = `STEP-${agentId}-${Date.now()}`;
    const agentStartTime = Date.now();

    steps.push({
      id: stepId,
      agentId,
      status: 'running',
      stepName: agentName,
      message: `Executing ${agentName} analysis...`,
      timestamp: new Date().toISOString(),
    });

    let timerId: any = null;
    try {
      // Execute the individual agent handler with a timeout guard
      const agentPromise = executeAgent(agentId, sanitizedText, enforcedScope, config, authToken);
      const timeoutPromise = new Promise<never>((_, reject) => {
        timerId = setTimeout(() => reject(new Error(`Agent execution timed out after 30 seconds`)), 30000);
        if (timerId && typeof timerId === 'object' && typeof timerId.unref === 'function') {
          timerId.unref();
        }
      });

      const res = await Promise.race([agentPromise, timeoutPromise]);
      if (timerId) clearTimeout(timerId);
      const durationMs = Date.now() - agentStartTime;

      rawAgentOutputs[agentId] = res.rawOutput;
      rawFindings.push(...res.findings);

      const stepIndex = steps.findIndex((s) => s.id === stepId);
      if (stepIndex !== -1) {
        steps[stepIndex] = {
          ...steps[stepIndex],
          status: 'completed',
          message: `Completed with ${res.findings.length} findings identified (${durationMs}ms).`,
          timestamp: new Date().toISOString(),
          findingsCount: res.findings.length,
          durationMs,
        };
      }

      executedSummaries.push({
        agentId,
        name: agentName,
        status: 'completed',
        durationMs,
        findingsCount: res.findings.length,
      });
    } catch (err: any) {
      if (timerId) clearTimeout(timerId);
      // Robust error handling: Log failure metadata, record incomplete check, do NOT halt pipeline!
      const durationMs = Date.now() - agentStartTime;
      const errorMessage = err?.message || 'Unknown execution error';

      failures.push({
        agentId,
        stepName: agentName,
        errorMessage,
        errorType: err?.name || 'AgentExecutionFailure',
        timestamp: new Date().toISOString(),
        durationMs,
      });

      limitationsAndIncompleteChecks.push(
        `Agent '${agentName}' failed: ${errorMessage}. Findings for this domain could not be evaluated.`
      );

      const stepIndex = steps.findIndex((s) => s.id === stepId);
      if (stepIndex !== -1) {
        steps[stepIndex] = {
          ...steps[stepIndex],
          status: 'failed',
          message: `Failed: ${errorMessage}`,
          timestamp: new Date().toISOString(),
          findingsCount: 0,
          durationMs,
          error: errorMessage,
        };
      }

      executedSummaries.push({
        agentId,
        name: agentName,
        status: 'failed',
        durationMs,
        findingsCount: 0,
        error: errorMessage,
      });
    }
  }

  // 5. Finding aggregation, deduplication & conflict detection
  const { deduplicatedFindings, conflicts } = aggregateAndDeduplicateFindings(rawFindings);

  const confirmedCount = deduplicatedFindings.filter((f) => f.category === 'confirmed').length;
  const potentialCount = deduplicatedFindings.filter((f) => f.category === 'potential').length;
  const informationalCount = deduplicatedFindings.filter((f) => f.category === 'informational').length;

  const severityBreakdown: Record<SeverityLevel, number> = {
    critical: deduplicatedFindings.filter((f) => f.severity === 'critical').length,
    high: deduplicatedFindings.filter((f) => f.severity === 'high').length,
    medium: deduplicatedFindings.filter((f) => f.severity === 'medium').length,
    low: deduplicatedFindings.filter((f) => f.severity === 'low').length,
    info: deduplicatedFindings.filter((f) => f.severity === 'info').length,
  };

  const recommendedRemediations = buildPrioritizedRemediations(deduplicatedFindings);

  // 6. Investigation Summary & Executive Markdown Report Generation
  const investigationSummary = `Multi-agent cybersecurity investigation completed across ${targetAgents.length} domain(s). Evaluated ${deduplicatedFindings.length} consolidated finding(s) with ${confirmedCount} confirmed, ${potentialCount} potential, and ${informationalCount} informational posture observations. ${failures.length > 0 ? `${failures.length} agent failure(s) recorded.` : 'All agents finished without pipeline errors.'}`;

  const executiveSummaryMarkdown = `# GAHAN AI CYBERSECURITY AUDIT REPORT
**Target Scope:** ${enforcedScope.targetScope || 'Authorized Target Scope'}
**Audit Timestamp:** ${new Date().toLocaleString()}
**Inference Engine:** ${
    config.provider === 'ollama'
      ? `Local Ollama (${config.ollamaModel}) [${config.localOnly || config.strictLocalOnly ? 'STRICT LOCAL ONLY' : 'Standard'}]`
      : 'Server Cloud Gemini'
  }
**Investigation Status:** ${failures.length > 0 ? 'COMPLETED WITH LIMITATIONS' : 'COMPLETED'}

---

### Executive Investigation Summary
${investigationSummary}

### Specialized Agents Executed
| Agent | Status | Duration | Findings |
| :--- | :--- | :--- | :--- |
${executedSummaries
  .map(
    (a) =>
      `| **${a.name}** | ${a.status === 'completed' ? '✅ Completed' : '❌ Failed'} | ${a.durationMs}ms | ${
        a.findingsCount
      } |`
  )
  .join('\n')}

---

### Risk & Severity Matrix
- 🔴 **Critical:** ${severityBreakdown.critical}
- 🟠 **High:** ${severityBreakdown.high}
- 🟡 **Medium:** ${severityBreakdown.medium}
- 🟢 **Low:** ${severityBreakdown.low}
- ℹ️ **Informational:** ${severityBreakdown.info}

---

### Key Prioritized Remediations
${
  recommendedRemediations.length > 0
    ? recommendedRemediations
        .map(
          (r, idx) =>
            `${idx + 1}. **[${r.priority.toUpperCase()}] ${r.title}**: ${r.action}`
        )
        .join('\n')
    : 'No critical remediation actions required.'
}

${
  conflicts.length > 0
    ? `\n### Conflicting Findings Analysis\n${conflicts
        .map(
          (c) =>
            `- **${c.title}** (${c.agentIds.join(', ')}): ${c.resolution}`
        )
        .join('\n')}\n`
    : ''
}

### Limitations & Incomplete Checks
${limitationsAndIncompleteChecks.map((lim) => `- ${lim}`).join('\n')}
`;

  return {
    id: `REPORT-ORCHESTRATOR-${Date.now()}`,
    timestamp: startTime.toISOString(),
    scope: enforcedScope,
    providerUsed: config,
    investigationSummary,
    agentsExecuted: executedSummaries,
    summary: {
      totalFindings: deduplicatedFindings.length,
      confirmedCount,
      potentialCount,
      informationalCount,
      severityBreakdown,
    },
    steps,
    findings: deduplicatedFindings,
    conflicts: conflicts.length > 0 ? conflicts : undefined,
    failures: failures.length > 0 ? failures : undefined,
    limitationsAndIncompleteChecks,
    recommendedRemediations,
    rawAgentOutputs,
    executiveSummaryMarkdown,
  };
}
