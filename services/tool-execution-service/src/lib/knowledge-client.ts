import type { KnowledgeRetrievalInput } from '../schemas/tool.schema.js';
import { logger } from '../utils/logger.js';

const KNOWLEDGE_SERVICE_URL =
  process.env.KNOWLEDGE_SERVICE_URL ?? 'http://localhost:3002';

export class KnowledgeClientError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'KnowledgeClientError';
    this.statusCode = statusCode;
  }
}

export interface KnowledgeSearchResponse {
  query: string;
  total: number;
  results: Array<{
    chunkId: number;
    chunkIndex: number;
    chunkText: string;
    metadata: unknown;
    documentId: number;
    filename: string;
    title: string | null;
    similarity: number;
  }>;
}

export async function searchKnowledge(
  authToken: string,
  input: KnowledgeRetrievalInput
): Promise<KnowledgeSearchResponse> {
  const url = `${KNOWLEDGE_SERVICE_URL.replace(/\/$/, '')}/documents/search`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(
      parseInt(process.env.TOOL_EXECUTION_TIMEOUT_MS ?? '30000', 10)
    ),
  });

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & Partial<KnowledgeSearchResponse>;

  if (!response.ok) {
    logger.warn(
      { status: response.status, error: body.error },
      'Knowledge service search failed'
    );
    throw new KnowledgeClientError(
      body.error ?? `Knowledge service returned ${response.status}`,
      response.status
    );
  }

  return body as KnowledgeSearchResponse;
}
