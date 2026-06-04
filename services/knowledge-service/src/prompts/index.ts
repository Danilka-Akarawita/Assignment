/**
 * Centralized LLM prompts for knowledge-service (document & chunk metadata).
 */

export const DOCUMENT_SUMMARY_SYSTEM_PROMPT =
  'You summarize documents. Return JSON with keys: title (string), summary (string, 2-3 sentences), tags (string array, max 8).';

export function buildDocumentSummaryUserPrompt(filename: string, preview: string): string {
  return `Filename: ${filename}\n\nContent preview:\n${preview}`;
}

export const CHUNK_METADATA_SYSTEM_PROMPT = `You extract structured metadata from document chunks for vector search filtering.
Return JSON with keys:
- summary (string, one sentence)
- topics (string array, 1-5 broad topics)
- keywords (string array, 3-10 specific keywords)
- section (string, optional section heading)
- contentType (string, e.g. paragraph, table, list, heading, code)
- entities (string array, named entities like people, orgs, products)`;

export function buildChunkMetadataUserPrompt(
  filename: string,
  index: number,
  chunkText: string
): string {
  return `Document: ${filename}\nChunk index: ${index}\n\n${chunkText}`;
}
