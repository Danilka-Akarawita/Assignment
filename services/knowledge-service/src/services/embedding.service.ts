import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  openai,
} from '../lib/openai.js';
import { getCachedEmbeddings, setCachedEmbeddings } from '../lib/embedding-cache.js';
import { logger } from '../utils/logger.js';

const BATCH_SIZE = parseInt(process.env.EMBEDDING_BATCH_SIZE ?? '64', 10);

export class EmbeddingService {
  async embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const cached = await getCachedEmbeddings(texts);
    const results: number[][] = new Array(texts.length);
    const missIndices: number[] = [];

    let cacheHits = 0;
    for (let i = 0; i < texts.length; i++) {
      const hit = cached[i];
      if (hit) {
        results[i] = hit;
        cacheHits++;
      } else {
        missIndices.push(i);
      }
    }

    if (cacheHits > 0) {
      logger.debug(
        { cacheHits, misses: missIndices.length, total: texts.length },
        'Embedding cache lookup'
      );
    }

    if (missIndices.length === 0) {
      return results;
    }

    const missTexts = missIndices.map((i) => texts[i]!);

    for (let i = 0; i < missTexts.length; i += BATCH_SIZE) {
      const batch = missTexts.slice(i, i + BATCH_SIZE);
      const batchIndices = missIndices.slice(i, i + BATCH_SIZE);

      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
        dimensions: EMBEDDING_DIMENSIONS,
      });

      const sorted = response.data.sort((a, b) => a.index - b.index);
      const embeddings = sorted.map((item) => item.embedding);

      const toCache: Array<{ text: string; embedding: number[] }> = [];
      for (let j = 0; j < batchIndices.length; j++) {
        const idx = batchIndices[j]!;
        const embedding = embeddings[j];
        if (!embedding) throw new Error(`Missing embedding for batch index ${j}`);
        results[idx] = embedding;
        toCache.push({ text: texts[idx]!, embedding });
      }

      await setCachedEmbeddings(toCache);

      logger.debug(
        { batchSize: batch.length, model: EMBEDDING_MODEL },
        'Embedding batch generated (cache miss)'
      );
    }

    logger.debug(
      {
        count: texts.length,
        cacheHits,
        apiCalls: missIndices.length,
        model: EMBEDDING_MODEL,
        dimensions: EMBEDDING_DIMENSIONS,
      },
      'Embeddings resolved'
    );

    return results;
  }

  async embedQuery(query: string): Promise<number[]> {
    const [embedding] = await this.embedTexts([query]);
    if (!embedding) throw new Error('Failed to generate query embedding');
    return embedding;
  }
}
