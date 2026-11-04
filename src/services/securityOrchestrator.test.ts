import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifySecurityTask,
  aggregateAndDeduplicateFindings,
  executeSecurityOrchestrator,
} from './securityOrchestrator.js';
import {
  SecurityFinding,
  ScopeAuthorization,
  AIProviderConfig,
  AgentExecutionInput,
} from '../types/cybersecurity.js';

test('1. Task Classification: accurately maps user intent and input signatures to specialized agents', () => {
  // Test code / SQLi
  const codeResult = classifySecurityTask('const user = "SELECT * FROM users WHERE id = " + req.query.id;');
  assert.ok(codeResult.primaryAgents.includes('web_security'));
  assert.ok(codeResult.primaryAgents.includes('secure_code'));
  assert.ok(codeResult.detectedDomains.length > 0);

  // Test Firewall / Network logs
  const netResult = classifySecurityTask('Review iptables rules and pfSense firewall config for 0.0.0.0/0 on port 22');
  assert.ok(netResult.primaryAgents.includes('network_security'));

  // Test CVE advisory lookup
  const cveResult = classifySecurityTask('Research CVE-2024-3094 advisory impact, EPSS score, and affected packages');
  assert.ok(cveResult.primaryAgents.includes('vulnerability_intel'));

  // Test Access logs / Brute force
  const logResult = classifySecurityTask('Parse nginx access.log for 401 unauthorized surges and brute force directory scans');
  assert.ok(logResult.primaryAgents.includes('threat_detection'));

  // Test Security Headers / Posture
  const headerResult = classifySecurityTask('Check Content-Security-Policy and HSTS headers on production reverse proxy');
  assert.ok(headerResult.primaryAgents.includes('security_audit'));

  // Test General fallback
  const genericResult = classifySecurityTask('Perform standard security posture assessment');
  assert.ok(genericResult.primaryAgents.length >= 2);
});

test('2. Finding Aggregation & Deduplication: merges overlapping findings and preserves evidence', () => {
  const findingA: SecurityFinding = {
    id: 'f-1',
    agentId: 'web_security',
    title: 'SQL Injection in User Query',
    category: 'confirmed',
    severity: 'critical',
    cveId: 'CVE-2024-12345',
    cweId: 'CWE-89',
    description: 'Direct concatenation in query string',
    evidence: [
      {
        sourceType: 'code',
        location: 'src/user.ts:42',
        rawExcerpt: 'db.query("SELECT * FROM users WHERE id=" + id)',
        explanation: 'Unsanitized parameter concatenation',
      },
    ],
    remediation: {
      explanation: 'Use parameterized queries',
      suggestedCode: 'db.query("SELECT * FROM users WHERE id = ?", [id])',
      preventionSteps: ['Enforce query parameterization'],
    },
  };

  const findingB: SecurityFinding = {
    id: 'f-2',
    agentId: 'secure_code',
    title: 'SQL Injection in User Query',
    category: 'confirmed',
    severity: 'critical',
    cveId: 'CVE-2024-12345',
    cweId: 'CWE-89',
    description: 'Vulnerable SQL query string needs prepared statements',
    evidence: [
      {
        sourceType: 'code',
        location: 'src/user.ts:45',
        rawExcerpt: 'const id = req.params.id;',
        explanation: 'Untrusted route parameter input source',
      },
    ],
    remediation: {
      explanation: 'Refactor database driver call',
      preventionSteps: ['Enable ESLint sql-injection rule'],
    },
  };

  const { deduplicatedFindings, conflicts } = aggregateAndDeduplicateFindings([findingA, findingB]);

  assert.equal(deduplicatedFindings.length, 1, 'Duplicate SQLi findings should be merged into 1');
  assert.equal(conflicts.length, 0, 'No conflict when severity and category agree');
  assert.equal(deduplicatedFindings[0].evidence.length, 2, 'Both unique evidence clips should be preserved');
  assert.equal(deduplicatedFindings[0].remediation.preventionSteps.length, 2, 'Prevention steps should be combined');
});

test('3. Conflict Resolution: detects severity/category discrepancies between agents and records conflicts', () => {
  const findingConfirmed: SecurityFinding = {
    id: 'f-conf-1',
    agentId: 'web_security',
    title: 'Cross-Site Scripting (XSS) in Search Component',
    category: 'confirmed',
    severity: 'critical',
    description: 'Direct dangerouslySetInnerHTML injection with unsanitized param',
    evidence: [
      {
        sourceType: 'code',
        location: 'Search.tsx:18',
        rawExcerpt: '<div dangerouslySetInnerHTML={{ __html: query }} />',
        explanation: 'Direct HTML injection',
      },
    ],
    remediation: {
      explanation: 'Use DOMPurify or standard text node',
      preventionSteps: ['Sanitize untrusted HTML'],
    },
  };

  const findingPotential: SecurityFinding = {
    id: 'f-conf-2',
    agentId: 'security_audit',
    title: 'Cross-Site Scripting (XSS) in Search Component',
    category: 'potential',
    severity: 'medium',
    description: 'Missing CSP header may allow inline script execution if XSS exists',
    evidence: [
      {
        sourceType: 'header',
        location: 'HTTP Response Headers',
        rawExcerpt: 'Content-Security-Policy: not set',
        explanation: 'Missing defense-in-depth header',
      },
    ],
    remediation: {
      explanation: 'Add CSP script-src directives',
      preventionSteps: ['Configure restrictive CSP header'],
    },
  };

  const { deduplicatedFindings, conflicts } = aggregateAndDeduplicateFindings([
    findingConfirmed,
    findingPotential,
  ]);

  assert.equal(deduplicatedFindings.length, 1, 'Findings should merge into single resolved finding');
  assert.equal(conflicts.length, 1, 'Discrepancy in severity/category must produce a conflict record');

  const conflict = conflicts[0];
  assert.ok(conflict.differingSeverities?.includes('critical'));
  assert.ok(conflict.differingSeverities?.includes('medium'));
  assert.ok(conflict.resolution.includes('CRITICAL'));
  assert.equal(deduplicatedFindings[0].severity, 'critical', 'Higher severity should be preserved for safety');
  assert.equal(deduplicatedFindings[0].evidence.length, 2, 'Evidence from both agents should be preserved');
});

test('4. Robust Error-Handling Mechanism: catches individual agent failures without halting pipeline and logs failure metadata', async () => {
  const offlineConfig: AIProviderConfig = {
    provider: 'ollama',
    ollamaEndpoint: 'http://localhost:11434',
    ollamaModel: 'qwen3:1.7b',
    geminiModel: 'gemini-3.8-flash',
    useFallback: false, // Prevents hanging network calls in unit tests
  };

  const testScope: ScopeAuthorization = {
    isAuthorized: true,
    targetScope: 'Error Isolation Unit Test',
    confirmedByUser: true,
    timestamp: new Date().toISOString(),
    disruptiveActionsBlocked: true,
  };

  // Run orchestrator with multiple agents
  const result = await executeSecurityOrchestrator(
    'SELECT * FROM users; iptables -A INPUT -p tcp --dport 22 -j ACCEPT; CVE-2024-3094;',
    testScope,
    offlineConfig,
    ['web_security', 'network_security', 'vulnerability_intel']
  );

  // Verify the pipeline completed and generated a valid report
  assert.ok(result.id.startsWith('REPORT-ORCHESTRATOR-'));
  assert.equal(result.scope.disruptiveActionsBlocked, true);
  assert.ok(result.steps.length >= 3);
  assert.ok(result.agentsExecuted && result.agentsExecuted.length >= 3);
  assert.ok(result.investigationSummary && result.investigationSummary.length > 0);
  assert.ok(result.executiveSummaryMarkdown.includes('GAHAN AI CYBERSECURITY AUDIT REPORT'));
  assert.ok(Array.isArray(result.limitationsAndIncompleteChecks));

  // Verify each step has execution duration metadata
  for (const step of result.steps) {
    assert.ok(step.status === 'completed' || step.status === 'failed');
    if (step.durationMs !== undefined) {
      assert.ok(step.durationMs >= 0);
    }
  }

  // If any agent failed, confirm failures are properly tracked with error metadata
  if (result.failures && result.failures.length > 0) {
    for (const failure of result.failures) {
      assert.ok(failure.agentId);
      assert.ok(failure.errorMessage);
      assert.ok(failure.errorType);
      assert.ok(failure.timestamp);
    }
  }
});

test('5. Consolidated Report Structure: verifies complete metadata, limitations, and remediations', async () => {
  const offlineConfig: AIProviderConfig = {
    provider: 'ollama',
    ollamaEndpoint: 'http://localhost:11434',
    ollamaModel: 'qwen3:1.7b',
    geminiModel: 'gemini-3.8-flash',
    useFallback: false,
  };

  const payload: AgentExecutionInput = {
    userPrompt: 'Audit application authentication endpoints and firewall configuration',
    sourceCode: 'app.post("/login", (req, res) => { const { user, pass } = req.body; });',
    logs: 'iptables -L -n -v',
    targetScope: {
      isAuthorized: true,
      targetScope: 'Staging Environment Audit',
      confirmedByUser: true,
      timestamp: new Date().toISOString(),
      disruptiveActionsBlocked: true,
    },
    providerConfig: offlineConfig,
  };

  const report = await executeSecurityOrchestrator(payload, undefined, offlineConfig, ['web_security', 'network_security']);

  // Check structured report properties
  assert.ok(report.id);
  assert.ok(report.timestamp);
  assert.ok(report.summary.totalFindings >= 0);
  assert.ok(typeof report.summary.confirmedCount === 'number');
  assert.ok(typeof report.summary.potentialCount === 'number');
  assert.ok(typeof report.summary.informationalCount === 'number');
  assert.ok(typeof report.summary.severityBreakdown.critical === 'number');

  // Check limitations
  assert.ok(report.limitationsAndIncompleteChecks && report.limitationsAndIncompleteChecks.length > 0);
  assert.ok(
    report.limitationsAndIncompleteChecks.some((lim) => lim.includes('blocked by authorization scope'))
  );

  // Check remediations
  assert.ok(Array.isArray(report.recommendedRemediations));

  // Check executive summary markdown
  assert.ok(report.executiveSummaryMarkdown.includes('### Executive Investigation Summary'));
  assert.ok(report.executiveSummaryMarkdown.includes('### Specialized Agents Executed'));
  assert.ok(report.executiveSummaryMarkdown.includes('### Risk & Severity Matrix'));
});
