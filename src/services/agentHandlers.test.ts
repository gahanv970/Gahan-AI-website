import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAndSanitizeInput,
  parseAgentOutputToFindings,
  executeWebSecurityAgent,
  executeNetworkSecurityAgent,
  executeVulnerabilityIntelAgent,
  executeThreatDetectionAgent,
  executeSecurityAuditAgent,
  executeSecureCodeAgent,
  executeOrchestrator,
  executeAgent,
} from './agentHandlers.js';
import { ScopeAuthorization, AIProviderConfig } from '../types/cybersecurity.js';

test('1. Input Sanitization: rejects empty input and strips control chars', () => {
  assert.throws(() => validateAndSanitizeInput(''), /Empty payload/);
  assert.throws(() => validateAndSanitizeInput('   '), /Empty payload/);

  const clean = validateAndSanitizeInput('  const secret = "test\x00key";  ');
  assert.equal(clean, 'const secret = "testkey";');
});

test('2. Output Parser & Evidence Enforcement: extracts evidence clips and normalizes findings', () => {
  const rawOutput = `
### 1. SQL Injection Vulnerability
- Status: CONFIRMED
- Severity: CRITICAL
- CVE: CVE-2024-12345
- CVSS: 9.8
Unsafe concatenation of user input in database query string.

### 2. Missing Security Headers
- Status: INFORMATIONAL
- Severity: LOW
Missing Content-Security-Policy header.
  `;

  const sampleCode = 'const query = "SELECT * FROM users WHERE id = " + req.query.id;\napp.listen(3000);';
  const findings = parseAgentOutputToFindings('web_security', rawOutput, sampleCode);

  assert.equal(findings.length, 2);

  const f1 = findings[0];
  assert.equal(f1.category, 'confirmed');
  assert.equal(f1.severity, 'critical');
  assert.equal(f1.cveId, 'CVE-2024-12345');
  assert.equal(f1.cvssScore, 9.8);
  assert.ok(f1.evidence.length > 0);
  assert.ok(f1.evidence[0].rawExcerpt.length > 0);

  const f2 = findings[1];
  assert.equal(f2.category, 'informational');
  assert.equal(f2.severity, 'low');
  assert.ok(f2.evidence.length > 0);
});

test('3. Anti-Fabrication: strips fake CVEs and out-of-bounds CVSS scores', () => {
  const rawOutput = `
### 1. Fake CVE Test
- Status: POTENTIAL
- Severity: HIGH
- CVE: CVE-FAKE-XXXXX
- CVSS: 99.5
Suspicious logic construct found.
  `;

  const findings = parseAgentOutputToFindings('web_security', rawOutput, 'function test() {}');
  assert.equal(findings[0].cveId, undefined, 'Fake CVE string should be stripped');
  assert.equal(findings[0].cvssScore, undefined, 'Out of bounds CVSS score should be stripped');
});

test('4. Explicit Local-Only Mode: throws explicit error when local Ollama is offline without falling back', async () => {
  const localOnlyConfig: AIProviderConfig = {
    provider: 'ollama',
    ollamaEndpoint: 'http://127.0.0.1:99999',
    ollamaModel: 'qwen3:1.7b',
    geminiModel: 'gemini-3.8-flash',
    useFallback: false,
    localOnly: true,
  };

  const defaultScope: ScopeAuthorization = {
    isAuthorized: true,
    targetScope: 'Unit test',
    confirmedByUser: true,
    timestamp: new Date().toISOString(),
    disruptiveActionsBlocked: true,
  };

  await assert.rejects(
    async () => {
      await executeWebSecurityAgent('const x = 1;', defaultScope, localOnlyConfig);
    },
    (err: any) => {
      assert.ok(
        String(err?.message || err).includes('LOCAL_ONLY_ERROR'),
        `Expected LOCAL_ONLY_ERROR in error message, but received: "${err?.message || err}"`
      );
      return true;
    }
  );
});

test('5. Individual Agent Dispatcher: executes specialized agents offline', async () => {
  const agents = ['web_security', 'network_security', 'vulnerability_intel', 'threat_detection', 'security_audit', 'secure_code'] as const;

  const offlineConfig: AIProviderConfig = {
    provider: 'ollama',
    ollamaEndpoint: 'http://localhost:11434',
    ollamaModel: 'qwen3:1.7b',
    geminiModel: 'gemini-3.8-flash',
    useFallback: false, // Prevents hanging network calls when offline
  };

  for (const agentId of agents) {
    const res = await executeAgent(
      agentId,
      'Sample audit payload for unit testing',
      undefined,
      offlineConfig
    );

    assert.equal(res.agentId, agentId);
    assert.ok(Array.isArray(res.findings));
    assert.ok(res.findings.length > 0);
    assert.ok(res.findings[0].evidence.length > 0);
  }
});

test('6. Sequential Orchestrator Execution: runs multi-agent pipeline and synthesizes summary report', async () => {
  const offlineConfig: AIProviderConfig = {
    provider: 'ollama',
    ollamaEndpoint: 'http://localhost:11434',
    ollamaModel: 'qwen3:1.7b',
    geminiModel: 'gemini-3.8-flash',
    useFallback: false,
  };

  const orchestratorResult = await executeOrchestrator(
    'SELECT * FROM users; iptables -A INPUT -p tcp --dport 22 -j ACCEPT;',
    undefined,
    offlineConfig,
    ['web_security', 'network_security']
  );

  assert.ok(orchestratorResult.id.startsWith('REPORT-ORCHESTRATOR-'));
  assert.equal(orchestratorResult.scope.disruptiveActionsBlocked, true);
  assert.ok(orchestratorResult.steps.length >= 2);
  assert.ok(orchestratorResult.findings.length >= 2);
  assert.ok(orchestratorResult.executiveSummaryMarkdown.includes('GAHAN AI CYBERSECURITY AUDIT REPORT'));
});
