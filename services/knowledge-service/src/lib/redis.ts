import { createClient, type RedisClientType } from 'redis';
import { logger } from '../utils/logger.js';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const cacheEnabled = process.env.EMBEDDING_CACHE_ENABLED !== 'false';

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType | null> | null = null;

export function isRedisCacheEnabled(): boolean {
  return cacheEnabled;
}

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (!cacheEnabled) return null;
  if (client?.isOpen) return client;

  if (!connectPromise) {
    connectPromise = (async () => {
      const redis = createClient({ url: REDIS_URL });
      redis.on('error', (err: Error) => {
        logger.warn({ err }, 'Redis client error');
      });
      try {
        await redis.connect();
        client = redis as RedisClientType;
        logger.info({ url: REDIS_URL.replace(/:[^:@]+@/, ':***@') }, 'Redis connected');
        return client;
      } catch (err) {
        logger.warn({ err, url: REDIS_URL }, 'Redis unavailable — embedding cache disabled');
        connectPromise = null;
        return null;
      }
    })();
  }

  return connectPromise;
}

export async function disconnectRedis(): Promise<void> {
  if (client?.isOpen) {
    await client.quit();
  }
  client = null;
  connectPromise = null;
}
