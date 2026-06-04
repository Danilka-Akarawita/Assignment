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

export const METADATA_QUERY_SYSTEM_PROMPT = `You map a user search question to metadata filters for a document knowledge base.

You receive a catalog of metadata values that already exist on indexed chunks. Your job is to pick values from that catalog that best match the question — do not invent new topics, keywords, entities, content types, or sections.

Return JSON only with optional keys (omit keys that do not apply):
- topics (string array): pick from catalog.topics
- keywords (string array): pick from catalog.keywords
- entities (string array): pick from catalog.entities
- contentType (string): pick exactly one value from catalog.contentTypes
- section (string): pick exactly one value from catalog.sections

Use the exact spelling from the catalog. If nothing in the catalog matches the question, return {}.`;

export function buildMetadataQueryUserPrompt(
  query: string,
  catalog: {
    topics: string[];
    keywords: string[];
    entities: string[];
    contentTypes: string[];
    sections: string[];
  },
): string {
  return `Existing metadata catalog (use only these values):
${JSON.stringify(catalog, null, 2)}

User search query:
${query.slice(0, 1500)}`;
}
