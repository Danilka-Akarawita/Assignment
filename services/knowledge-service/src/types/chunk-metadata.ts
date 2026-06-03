export interface ChunkMetadata {
  summary: string;
  topics: string[];
  keywords: string[];
  section?: string;
  contentType?: string;
  entities?: string[];
}

export function isChunkMetadata(value: unknown): value is ChunkMetadata {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.summary === 'string' &&
    Array.isArray(obj.topics) &&
    Array.isArray(obj.keywords)
  );
}
