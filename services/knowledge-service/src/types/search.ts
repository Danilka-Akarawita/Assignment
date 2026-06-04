import type { ChunkMetadata } from './chunk-metadata.js';
import type { SearchMetadataFilters } from './search-filters.js';

export interface SearchResult {
  chunk_id: number;
  chunk_index: number;
  chunk_text: string;
  metadata: ChunkMetadata | null;
  document_id: number;
  filename: string;
  title: string | null;
  similarity: number;
}

export interface SearchResponse {
  query: string;
  total: number;
  appliedFilters: SearchMetadataFilters | null;
  retrieval: {
    metadataFallback: boolean;
  };
  results: Array<{
    chunkId: number;
    chunkIndex: number;
    chunkText: string;
    metadata: ChunkMetadata | null;
    documentId: number;
    filename: string;
    title: string | null;
    similarity: number;
  }>;
}
