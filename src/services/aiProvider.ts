import { AIProviderConfig, SecurityAgentId } from '../types/cybersecurity';
import { SYSTEM_PROMPTS } from './agentPrompts';

export const DEFAULT_AI_CONFIG: AIProviderConfig = {
  provider: 'ollama',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'qwen3:1.7b',
  geminiModel: 'gemini-3.8-flash',
  useFallback: true,
};

/**
 * Checks if local Ollama service is reachable.
 */
export async function checkOllamaHealth(endpoint: string = 'http://localhost:11434'): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${endpoint}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(id);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Executes prompt query via local Ollama API (/api/generate or /api/chat).
 */
export async function queryOllama(
  prompt: string,
  systemPrompt: string,
  config: AIProviderConfig = DEFAULT_AI_CONFIG
): Promise<string> {
  const endpoint = config.ollamaEndpoint || 'http://localhost:11434';
  const model = config.ollamaModel || 'qwen3:1.7b';

  const response = await fetch(`${endpoint}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: `${systemPrompt}\n\nUSER REQUEST:\n${prompt}`,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama HTTP Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.response || '';
}

/**
 * Executes prompt query via GAHAN AI server streaming proxy (/api/chat/stream).
 */
export async function queryServerStream(
  prompt: string,
  systemPrompt: string,
  token?: string
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const combinedMessage = `[SYSTEM CONTEXT: ${systemPrompt}]\n\n${prompt}`;
  const baseUrl = typeof window !== 'undefined' ? '' : (process.env.SERVER_URL || 'http://localhost:3000');

  const res = await fetch(`${baseUrl}/api/chat/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: combinedMessage,
      requestedModel: 'gemini-3.8-flash',
    }),
  });

  if (!res.ok) {
    throw new Error(`Server stream HTTP error: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No readable stream available');

  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const json = JSON.parse(line.slice(6));
          if (json.error) {
            throw new Error(json.message || json.error);
          }
          if (json.text) {
            fullText += json.text;
          }
        } catch {
          // Ignore partial chunk parse errors
        }
      }
    }
  }

  return fullText;
}

/**
 * Unified dispatch function that respects local Ollama as primary provider.
 * When config.localOnly is true, it strictly never falls back to cloud Gemini.
 */
export async function runSecurityAgentQuery(
  agentId: SecurityAgentId,
  userPrompt: string,
  config: AIProviderConfig = DEFAULT_AI_CONFIG,
  authToken?: string
): Promise<{ text: string; providerUsed: 'ollama' | 'gemini' | 'simulated' }> {
  const systemPrompt = SYSTEM_PROMPTS[agentId] || SYSTEM_PROMPTS.orchestrator;

  const isLocalOnly = Boolean(config.localOnly || config.strictLocalOnly);

  // 1. Try Local Ollama if selected or default
  if (config.provider === 'ollama') {
    try {
      const isHealthy = await checkOllamaHealth(config.ollamaEndpoint);
      if (isHealthy) {
        const text = await queryOllama(userPrompt, systemPrompt, config);
        if (text && text.trim().length > 0) {
          return { text, providerUsed: 'ollama' };
        }
      }
    } catch (err: any) {
      console.warn('[GAHAN AI] Local Ollama query failed:', err.message || err);
      if (isLocalOnly) {
        throw new Error(`LOCAL_ONLY_ERROR: Ollama local query failed (${err.message || 'Error'}). Local-only mode is enforced; cloud Gemini fallback is disabled.`);
      }
    }

    if (isLocalOnly) {
      throw new Error(`LOCAL_ONLY_ERROR: Local Ollama service is unreachable at ${config.ollamaEndpoint}. Local-only mode is enforced; cloud Gemini fallback is disabled.`);
    }
  }

  // 2. Try Server Gemini stream fallback if enabled and NOT in localOnly mode
  if (!isLocalOnly && (config.useFallback || config.provider === 'gemini')) {
    try {
      const text = await queryServerStream(userPrompt, systemPrompt, authToken);
      if (text && text.trim().length > 0) {
        return { text, providerUsed: 'gemini' };
      }
    } catch (err) {
      console.warn('[GAHAN AI] Server streaming fallback failed:', err);
    }
  }

  if (isLocalOnly) {
    throw new Error('LOCAL_ONLY_ERROR: Local Ollama provider failed and localOnly mode prevents fallback.');
  }

  // 3. Guaranteed graceful fallback response if both offline
  return {
    text: `[GAHAN AI LOCAL ENGINE NOTICE]
Primary Ollama local endpoint (${config.ollamaEndpoint}) and cloud provider backup are currently offline.
Selected Agent: ${agentId.toUpperCase()}
Prompt Received: "${userPrompt.slice(0, 100)}..."

To connect local AI inference:
1. Ensure Ollama is running locally: \`ollama serve\`
2. Pull required model: \`ollama pull ${config.ollamaModel}\`
3. Verify endpoint accessibility at ${config.ollamaEndpoint}`,
    providerUsed: 'simulated'
  };
}
