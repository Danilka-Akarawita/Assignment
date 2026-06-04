import type { ChunkMetadata } from './chunk-metadata.js';

export type SearchMetadataFilters = Partial<
  Pick<ChunkMetadata, 'topics' | 'keywords' | 'entities' | 'contentType' | 'section'>
>;
