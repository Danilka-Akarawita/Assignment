import { METADATA_MODEL, openai } from '../lib/openai.js';
import { METADATA_QUERY_SYSTEM_PROMPT } from '../prompts/index.js';
import type { SearchMetadataFilters } from '../types/search-filters.js';
import { logger } from '../utils/logger.js';

export type { SearchMetadataFilters };

function metadataQueryEnabled(): boolean {
  return process.env.METADATA_QUERY_EXTRACTION_ENABLED !== 'false';
}

function mergeStringArrays(
  a?: string[],
  b?: string[],
): string[] | undefined {
  const merged = [...new Set([...(a ?? []), ...(b ?? [])].map((s) => s.trim()).filter(Boolean))];
  return merged.length > 0 ? merged : undefined;
}

/** Explicit API filters win; extracted query hints fill gaps. */
export function mergeSearchFilters(
  explicit?: SearchMetadataFilters,
  extracted?: SearchMetadataFilters,
): SearchMetadataFilters | undefined {
  const merged: SearchMetadataFilters = {};
  const topics = mergeStringArrays(explicit?.topics, extracted?.topics);
  const keywords = mergeStringArrays(explicit?.keywords, extracted?.keywords);
  const entities = mergeStringArrays(explicit?.entities, extracted?.entities);
  if (topics) merged.topics = topics;
  if (keywords) merged.keywords = keywords;
  if (entities) merged.entities = entities;
  const contentType = explicit?.contentType ?? extracted?.contentType;
  const section = explicit?.section ?? extracted?.section;
  if (contentType) merged.contentType = contentType;
  if (section) merged.section = section;

  const hasValue = Object.values(merged).some((v) =>
    Array.isArray(v) ? v.length > 0 : v !== undefined && v !== '',
  );
  return hasValue ? merged : undefined;
}

export function filtersToVectorParams(
  filters?: SearchMetadataFilters,
): Pick<
  import('../lib/vector.js').VectorSearchParams,
  'topics' | 'keywords' | 'entities' | 'contentType' | 'section'
> {
  if (!filters) return {};
  const out: ReturnType<typeof filtersToVectorParams> = {};
  if (filters.topics?.length) out.topics = filters.topics;
  if (filters.keywords?.length) out.keywords = filters.keywords;
  if (filters.entities?.length) out.entities = filters.entities;
  if (filters.contentType) out.contentType = filters.contentType;
  if (filters.section) out.section = filters.section;
  return out;
}

export class MetadataQueryService {
  async extractFromQuery(query: string): Promise<SearchMetadataFilters> {
    if (!metadataQueryEnabled()) {
      return {};
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      logger.debug('Metadata query extraction skipped: no OPENAI_API_KEY');
      return {};
    }

    const model = process.env.METADATA_QUERY_MODEL ?? METADATA_MODEL;

    try {
      const response = await openai.chat.completions.create({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: METADATA_QUERY_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `User search query:\n${query.slice(0, 1500)}`,
          },
        ],
      });

      const raw = response.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw) as SearchMetadataFilters;

      const filters: SearchMetadataFilters = {};
      if (Array.isArray(parsed.topics) && parsed.topics.length) {
        filters.topics = parsed.topics.map(String).slice(0, 8);
      }
      if (Array.isArray(parsed.keywords) && parsed.keywords.length) {
        filters.keywords = parsed.keywords.map(String).slice(0, 12);
      }
      if (Array.isArray(parsed.entities) && parsed.entities.length) {
        filters.entities = parsed.entities.map(String).slice(0, 8);
      }
      if (typeof parsed.contentType === 'string' && parsed.contentType.trim()) {
        filters.contentType = parsed.contentType.trim().slice(0, 64);
      }
      if (typeof parsed.section === 'string' && parsed.section.trim()) {
        filters.section = parsed.section.trim().slice(0, 200);
      }

      logger.info(
        { queryPreview: query.slice(0, 80), filters },
        'Extracted metadata filters from query',
      );

      return filters;
    } catch (err) {
      logger.warn({ err }, 'Metadata query extraction failed');
      return {};
    }
  }
}
