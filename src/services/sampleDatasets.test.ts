import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_DATASETS,
  datasetStore,
} from '../data/sampleDatasets.js';
import {
  getRegisteredDatasets,
  getDatasetById,
  loadDatasetForWorkbench,
  executeDemoAnalysis,
  resetDatasets,
  validateDatasetPayload,
} from './datasetService.js';
import { SecurityAgentId, SyntheticSecurityDataset } from '../types/cybersecurity.js';

test('1. Dataset Registration & Coverage: provides pre-loaded datasets for all 6 specialized domains', () => {
  const datasets = getRegisteredDatasets();
  assert.equal(datasets.length, 6, 'Should register 6 specialized datasets');

  const requiredAgents: SecurityAgentId[] = [
    'web_security',
    'network_security',
    'vulnerability_intel',
    'threat_detection',
    'security_audit',
    'secure_code',
  ];

  for (const agentId of requiredAgents) {
    const agentDatasets = getRegisteredDatasets(agentId);
    assert.ok(agentDatasets.length >= 1, `Must have at least 1 pre-loaded dataset for ${agentId}`);
    assert.equal(agentDatasets[0].agentId, agentId);
    assert.ok(agentDatasets[0].title.length > 0);
    assert.ok(agentDatasets[0].description.length > 0);
    assert.ok(agentDatasets[0].expectedFindings.length >= 2, `${agentId} dataset must have at least 2 expected findings`);
  }
});

test('2. Synthetic Safety & License: ensures synthetic flags and no real credentials or production secrets', () => {
  const datasets = getRegisteredDatasets();

  for (const d of datasets) {
    assert.equal(d.metadata.isSynthetic, true);
    assert.equal(d.metadata.containsCredentials, false);
    assert.equal(d.metadata.safeForDemo, true);
    assert.ok(d.metadata.license.includes('MIT') || d.metadata.license.includes('Defensive'));

    // Check for accidental real secret keys
    const jsonStr = JSON.stringify(d);
    assert.ok(!jsonStr.includes('BEGIN RSA PRIVATE KEY'));
    assert.ok(!jsonStr.includes('AKIA'));
    assert.ok(!jsonStr.includes('ghp_'));
  }
});

test('3. Expected Findings Validation: verifies explicit line evidence, categories, and valid CVSS', () => {
  const datasets = getRegisteredDatasets();

  for (const d of datasets) {
    for (const finding of d.expectedFindings) {
      assert.ok(finding.id.startsWith('EXP-'));
      assert.ok(finding.title.length > 0);
      assert.ok(['confirmed', 'potential', 'informational'].includes(finding.category));
      assert.ok(['critical', 'high', 'medium', 'low', 'info'].includes(finding.severity));

      if (finding.cvssScore !== undefined) {
        assert.ok(finding.cvssScore >= 0.0 && finding.cvssScore <= 10.0);
      }

      // Evidence enforcement
      assert.ok(finding.evidence.length > 0, `Finding ${finding.id} in ${d.id} must have evidence`);
      for (const ev of finding.evidence) {
        assert.ok(ev.rawExcerpt.length > 0);
        assert.ok(ev.explanation.length > 0);
      }

      // Remediation enforcement
      assert.ok(finding.remediation.explanation.length > 0);
      assert.ok(finding.remediation.preventionSteps.length > 0);
    }
  }
});

test('4. Schema Validation: accepts valid datasets and rejects corrupted payloads or sensitive keys', () => {
  const webDataset = getDatasetById('dataset-web-owasp-top3');
  assert.ok(webDataset);

  // Valid dataset validation
  const validRes = validateDatasetPayload(webDataset);
  assert.equal(validRes.isValid, true);
  assert.equal(validRes.errors.length, 0);

  // Missing required fields
  const invalidRes1 = validateDatasetPayload({ title: 'Corrupted dataset' });
  assert.equal(invalidRes1.isValid, false);
  assert.ok(invalidRes1.errors.some((e) => e.includes('id')));

  // Secret token injection attempt
  const maliciousDataset = {
    ...webDataset,
    inputs: {
      ...webDataset.inputs,
      userPrompt: 'Audit with secret -----BEGIN PRIVATE KEY----- ABCDEF',
    },
  };
  const secretRes = validateDatasetPayload(maliciousDataset);
  assert.equal(secretRes.isValid, false);
  assert.ok(secretRes.errors.some((e) => e.includes('private keys')));
});

test('5. Demo Mode Execution: returns verified, labeled simulated results without external tokens', () => {
  const demoResult = executeDemoAnalysis('dataset-web-owasp-top3');

  assert.equal(demoResult.isDemo, true);
  assert.equal(demoResult.result.providerUsed, 'simulated');
  assert.ok(demoResult.label.includes('SIMULATED BENCHMARK DEMO'));
  assert.ok(demoResult.result.findings.length >= 3);
  assert.ok(demoResult.result.warnings && demoResult.result.warnings.length > 0);
  assert.ok(demoResult.result.warnings[0].includes('DEMO MODE'));
  assert.equal(demoResult.state.status, 'demo_completed');
});

test('6. Workbench Integration & Reset Functionality: loads dataset state and restores factory defaults', () => {
  // Load for workbench
  const workbench = loadDatasetForWorkbench('dataset-net-firewall-anomalies');
  assert.equal(workbench.state.status, 'loaded');
  assert.equal(workbench.state.datasetId, 'dataset-net-firewall-anomalies');
  assert.ok(workbench.dataset.inputs.logs && workbench.dataset.inputs.logs.length > 0);

  // Mutate in store
  const original = getDatasetById('dataset-net-firewall-anomalies')!;
  const modified: SyntheticSecurityDataset = {
    ...original,
    title: 'MODIFIED TEMPORARY TITLE FOR TEST',
  };
  datasetStore.update('dataset-net-firewall-anomalies', modified);
  assert.equal(getDatasetById('dataset-net-firewall-anomalies')?.title, 'MODIFIED TEMPORARY TITLE FOR TEST');

  // Trigger factory reset
  const resetRes = resetDatasets();
  assert.equal(resetRes.success, true);
  assert.equal(resetRes.totalDatasets, 6);

  // Confirm title restored
  const restored = getDatasetById('dataset-net-firewall-anomalies')!;
  assert.equal(restored.title, 'Synthetic DMZ Gateway & Firewall Posture');
});
