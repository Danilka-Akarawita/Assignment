import { vectorSearch, type VectorSearchParams } from '../lib/vector.js';
import type { ChunkMetadata } from '../types/chunk-metadata.js';
import type { SearchResponse } from '../types/search.js';
import { logger } from '../utils/logger.js';
import { EmbeddingService } from './embedding.service.js';

export interface SearchOptions {
  query: string;
  userId: number;
  limit?: number;
  documentId?: number;
  filters?: Partial<ChunkMetadata>;
  minSimilarity?: number;
}

export class SearchService {
  private embedding = new EmbeddingService();

  async search(options: SearchOptions): Promise<SearchResponse> {
    const {
      query,
      userId,
      limit = 10,
      documentId,
      filters,
      minSimilarity = 0.5,
    } = options;

    const queryEmbedding = await this.embedding.embedQuery(query);

    const searchParams: VectorSearchParams = {
      queryEmbedding,
      userId,
      limit,
      minSimilarity,
    };

    if (documentId !== undefined) searchParams.documentId = documentId;
    if (filters?.topics?.length) searchParams.topics = filters.topics;
    if (filters?.keywords?.length) searchParams.keywords = filters.keywords;
    if (filters?.entities?.length) searchParams.entities = filters.entities;
    if (filters?.contentType) searchParams.contentType = filters.contentType;
    if (filters?.section) searchParams.section = filters.section;

    const results = await vectorSearch(searchParams);

    logger.info(
      { userId, query: query.slice(0, 80), resultCount: results.length },
      'Vector search completed'
    );

    return {
      query,
      total: results.length,
      results: results.map((row) => ({
        chunkId: row.chunk_id,
        chunkIndex: row.chunk_index,
        chunkText: row.chunk_text,
        metadata: row.metadata,
        documentId: row.document_id,
        filename: row.filename,
        title: row.title,
        similarity: Number(row.similarity),
      })),
    };
  }
}
