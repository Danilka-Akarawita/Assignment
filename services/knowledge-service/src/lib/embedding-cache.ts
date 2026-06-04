import { createHash } from 'node:crypto';
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from './openai.js';
import { getRedisClient, isRedisCacheEnabled } from './redis.js';
import { logger } from '../utils/logger.js';

const CACHE_VERSION = 'v1';
const TTL_SECONDS = parseInt(process.env.EMBEDDING_CACHE_TTL_SEC ?? `${60 * 60 * 24 * 30}`, 10);

export function normalizeEmbeddingText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function embeddingCacheKey(text: string): string {
  const normalized = normalizeEmbeddingText(text);
  const hash = createHash('sha256').update(normalized, 'utf8').digest('hex');
  return `emb:${CACHE_VERSION}:${EMBEDDING_MODEL}:${EMBEDDING_DIMENSIONS}:${hash}`;
}

export async function getCachedEmbeddings(
  texts: string[]
): Promise<(number[] | null)[]> {
  if (!isRedisCacheEnabled() || texts.length === 0) {
    return texts.map(() => null);
  }

  const redis = await getRedisClient();
  if (!redis) return texts.map(() => null);

  const keys = texts.map(embeddingCacheKey);
  try {
    const raw = await redis.mGet(keys);
    return raw.map((value: string | null) => {
      if (!value) return null;
      try {
        const parsed = JSON.parse(value) as unknown;
        if (!Array.isArray(parsed) || parsed.length !== EMBEDDING_DIMENSIONS) {
          return null;
        }
        return parsed as number[];
      } catch {
        return null;
      }
    });
  } catch (err) {
    logger.warn({ err }, 'Redis mGet failed for embeddings');
    return texts.map(() => null);
  }
}

export async function setCachedEmbeddings(
  entries: Array<{ text: string; embedding: number[] }>
): Promise<void> {
  if (!isRedisCacheEnabled() || entries.length === 0) return;

  const redis = await getRedisClient();
  if (!redis) return;

  try {
    const multi = redis.multi();
    for (const { text, embedding } of entries) {
      if (embedding.length !== EMBEDDING_DIMENSIONS) continue;
      multi.set(embeddingCacheKey(text), JSON.stringify(embedding), {
        EX: TTL_SECONDS,
      });
    }
    await multi.exec();
    logger.debug({ count: entries.length, ttlSec: TTL_SECONDS }, 'Embeddings cached in Redis');
  } catch (err) {
    logger.warn({ err }, 'Redis cache write failed for embeddings');
  }
}
