import { getGatewayContext } from '../lib/request-context.js';
import { logger } from '../utils/logger.js';

const TOOL_URL =
  process.env.TOOL_EXECUTION_SERVICE_URL ?? 'http://localhost:3003';

export type RemoteToolName = 'sql' | 'calculator' | 'knowledge_retrieval';

export async function executeRemoteTool(
  tool: RemoteToolName,
  arguments_: Record<string, unknown>
): Promise<unknown> {
  const { authToken } = getGatewayContext();
  const url = `${TOOL_URL.replace(/\/$/, '')}/tools/execute`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ tool, arguments: arguments_ }),
    signal: AbortSignal.timeout(
      parseInt(process.env.TOOL_EXECUTION_TIMEOUT_MS ?? '60000', 10)
    ),
  });

  const body = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
    result?: unknown;
  };

  if (!response.ok || !body.success) {
    const message = body.error ?? `Tool service error (${response.status})`;
    logger.warn({ tool, status: response.status, message }, 'Remote tool failed');
    throw new Error(message);
  }

  return body.result;
}
