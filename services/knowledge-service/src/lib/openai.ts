import OpenAI from 'openai';
import { logger } from '../utils/logger.js';

function normalizeApiKey(key: string | undefined): string {
  if (!key) return '';
  return key.trim().replace(/^["']|["']$/g, '');
}

const apiKey = normalizeApiKey(process.env.OPENAI_API_KEY);

if (!apiKey) {
  logger.warn('OPENAI_API_KEY is not set — embedding and metadata generation will fail');
}

export const openai = new OpenAI({ apiKey: apiKey ?? '' });

export const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small';

export const METADATA_MODEL =
  process.env.OPENAI_METADATA_MODEL ?? 'gpt-5.4-nano-2026-03-17';

export const EMBEDDING_DIMENSIONS = parseInt(
  process.env.OPENAI_EMBEDDING_DIMENSIONS ?? '1536',
  10
);
