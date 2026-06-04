import { vectorSearch, type VectorSearchParams } from '../lib/vector.js';
import type { ChunkMetadata } from '../types/chunk-metadata.js';
import type { SearchResponse } from '../types/search.js';
import { logger } from '../utils/logger.js';
import { EmbeddingService } from './embedding.service.js';
import {
  filtersToVectorParams,
  mergeSearchFilters,
  MetadataQueryService,
} from './metadata-query.service.js';

export interface SearchOptions {
  query: string;
  userId: number;
  limit?: number;
  documentId?: number;
  filters?: Partial<ChunkMetadata>;
  minSimilarity?: number;
  /** When false, skip LLM metadata extraction from the query. */
  useMetadataExtraction?: boolean;
}

export class SearchService {
  private embedding = new EmbeddingService();
  private metadataQuery = new MetadataQueryService();

  async search(options: SearchOptions): Promise<SearchResponse> {
    const {
      query,
      userId,
      limit = 10,
      documentId,
      filters,
      minSimilarity = 0.5,
      useMetadataExtraction = true,
    } = options;

    const extracted =
      useMetadataExtraction && process.env.METADATA_QUERY_EXTRACTION_ENABLED !== 'false'
        ? await this.metadataQuery.extractFromQuery(query)
        : {};

    const mergedFilters = mergeSearchFilters(filters, extracted);
    const metadataFilterParams = filtersToVectorParams(mergedFilters);

    const queryEmbedding = await this.embedding.embedQuery(query);

    const baseParams: VectorSearchParams = {
      queryEmbedding,
      userId,
      limit,
      minSimilarity,
      ...metadataFilterParams,
    };
    if (documentId !== undefined) baseParams.documentId = documentId;

    let results = await vectorSearch(baseParams);
    let metadataFallback = false;

    if (results.length === 0 && Object.keys(metadataFilterParams).length > 0) {
      metadataFallback = true;
      logger.info(
        { userId, filters: mergedFilters },
        'No hits with metadata filters — retrying vector search without metadata',
      );
      const fallbackParams: VectorSearchParams = {
        queryEmbedding,
        userId,
        limit,
        minSimilarity,
      };
      if (documentId !== undefined) fallbackParams.documentId = documentId;
      results = await vectorSearch(fallbackParams);
    }

    logger.info(
      {
        userId,
        query: query.slice(0, 80),
        resultCount: results.length,
        metadataFilters: mergedFilters,
        metadataFallback,
      },
      'Knowledge search completed',
    );

    return {
      query,
      total: results.length,
      appliedFilters: mergedFilters ?? null,
      retrieval: {
        metadataFallback,
      },
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
