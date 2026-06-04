import { logger } from '../utils/logger.js';

const KNOWLEDGE_SERVICE_URL =
  process.env.KNOWLEDGE_SERVICE_URL ?? 'http://localhost:3002';

export interface KnowledgeDocumentSummary {
  id: number;
  filename: string;
  title: string | null;
  summary: string | null;
  status: string;
  chunkCount: number;
}

export async function listKnowledgeDocuments(
  authToken: string
): Promise<KnowledgeDocumentSummary[]> {
  const url = `${KNOWLEDGE_SERVICE_URL.replace(/\/$/, '')}/documents`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${authToken}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      logger.warn(
        { status: response.status },
        'Failed to load knowledge catalog for agent'
      );
      return [];
    }

    const body = (await response.json()) as {
      documents?: KnowledgeDocumentSummary[];
    };
    return body.documents ?? [];
  } catch (err) {
    logger.warn({ err }, 'Knowledge catalog request failed');
    return [];
  }
}
