import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  openai,
} from '../lib/openai.js';
import { logger } from '../utils/logger.js';

const BATCH_SIZE = parseInt(process.env.EMBEDDING_BATCH_SIZE ?? '64', 10);

export class EmbeddingService {
  async embedTexts(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
        dimensions: EMBEDDING_DIMENSIONS,
      });

      const sorted = response.data.sort((a, b) => a.index - b.index);
      allEmbeddings.push(...sorted.map((item) => item.embedding));
    }

    logger.debug(
      { count: texts.length, model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS },
      'Embeddings generated'
    );

    return allEmbeddings;
  }

  async embedQuery(query: string): Promise<number[]> {
    const [embedding] = await this.embedTexts([query]);
    if (!embedding) throw new Error('Failed to generate query embedding');
    return embedding;
  }
}
