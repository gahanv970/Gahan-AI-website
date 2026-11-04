import {
  SyntheticSecurityDataset,
  DatasetValidationResult,
  AgentExecutionResult,
  SecurityAgentId,
} from '../types/cybersecurity.js';
import { datasetStore } from '../data/sampleDatasets.js';

export interface DatasetExecutionState {
  datasetId: string;
  loadedAt: string;
  status: 'idle' | 'loaded' | 'running_demo' | 'demo_completed' | 'custom_modified';
  simulatedResult?: AgentExecutionResult;
}

/**
 * Returns all registered synthetic datasets, optionally filtered by agent.
 */
export function getRegisteredDatasets(agentId?: SecurityAgentId): SyntheticSecurityDataset[] {
  if (agentId && agentId !== 'orchestrator') {
    return datasetStore.getByAgent(agentId);
  }
  return datasetStore.getAll();
}

/**
 * Retrieves a single dataset by ID.
 */
export function getDatasetById(id: string): SyntheticSecurityDataset | undefined {
  return datasetStore.getById(id);
}

/**
 * Prepares dataset input payload for Workbench loading.
 */
export function loadDatasetForWorkbench(datasetId: string): {
  dataset: SyntheticSecurityDataset;
  state: DatasetExecutionState;
} {
  const dataset = datasetStore.getById(datasetId);
  if (!dataset) {
    throw new Error(`Dataset with ID "${datasetId}" was not found.`);
  }

  const state: DatasetExecutionState = {
    datasetId,
    loadedAt: new Date().toISOString(),
    status: 'loaded',
  };

  return { dataset, state };
}

/**
 * Executes a simulated demo analysis for the selected dataset.
 * Returns verified, pre-computed benchmark results without contacting external APIs
 * or running intrusive scans, clearly labelled as simulated demo mode.
 */
export function executeDemoAnalysis(datasetId: string): {
  result: AgentExecutionResult;
  isDemo: true;
  label: string;
  state: DatasetExecutionState;
} {
  const dataset = datasetStore.getById(datasetId);
  if (!dataset) {
    throw new Error(`Dataset with ID "${datasetId}" was not found.`);
  }

  // Generate verified demo result
  const demoResult: AgentExecutionResult = {
    id: `DEMO-EXEC-${dataset.id}-${Date.now()}`,
    agentId: dataset.agentId,
    timestamp: new Date().toISOString(),
    findings: dataset.expectedFindings.map((f) => ({
      ...f,
      evidence: [...f.evidence],
      remediation: {
        ...f.remediation,
        preventionSteps: [...f.remediation.preventionSteps],
      },
    })),
    rawText: dataset.demoSimulatedResult.rawText,
    providerUsed: 'simulated',
    scopeValid: true,
    warnings: [
      'DEMO MODE: Results are simulated benchmarks using verified synthetic training datasets. No live scanning or external tokens used.',
    ],
  };

  const state: DatasetExecutionState = {
    datasetId,
    loadedAt: new Date().toISOString(),
    status: 'demo_completed',
    simulatedResult: demoResult,
  };

  return {
    result: demoResult,
    isDemo: true,
    label: '[SIMULATED BENCHMARK DEMO - VERIFIED FINDINGS]',
    state,
  };
}

/**
 * Resets all datasets back to original factory defaults.
 */
export function resetDatasets(): { success: true; totalDatasets: number } {
  datasetStore.reset();
  return {
    success: true,
    totalDatasets: datasetStore.getAll().length,
  };
}

/**
 * Validates untrusted custom or uploaded dataset against strict schema requirements.
 */
export function validateDatasetPayload(data: unknown): DatasetValidationResult {
  return datasetStore.validate(data);
}
