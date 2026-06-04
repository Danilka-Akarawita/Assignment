import { METADATA_MODEL, openai } from '../lib/openai.js';
import {
  buildMetadataQueryUserPrompt,
  METADATA_QUERY_SYSTEM_PROMPT,
} from '../prompts/index.js';
import type { SearchMetadataFilters } from '../types/search-filters.js';
import { logger } from '../utils/logger.js';
import {
  catalogHasValues,
  loadMetadataCatalog,
  type ExistingMetadataCatalog,
} from './metadata-catalog.service.js';

export type { SearchMetadataFilters };

function metadataQueryEnabled(): boolean {
  return process.env.METADATA_QUERY_EXTRACTION_ENABLED !== 'false';
}

function pickFromCatalog(requested: string[], catalog: string[]): string[] | undefined {
  const byLower = new Map(catalog.map((v) => [v.toLowerCase(), v]));
  const picked = [
    ...new Set(
      requested
        .map((r) => byLower.get(r.trim().toLowerCase()))
        .filter((v): v is string => Boolean(v)),
    ),
  ];
  return picked.length > 0 ? picked : undefined;
}

function pickScalarFromCatalog(
  value: string | undefined,
  catalog: string[],
): string | undefined {
  if (!value?.trim() || catalog.length === 0) return undefined;
  const match = catalog.find((c) => c.toLowerCase() === value.trim().toLowerCase());
  return match;
}

export function restrictFiltersToCatalog(
  parsed: SearchMetadataFilters,
  catalog: ExistingMetadataCatalog,
): SearchMetadataFilters {
  const filters: SearchMetadataFilters = {};

  if (Array.isArray(parsed.topics)) {
    const topics = pickFromCatalog(parsed.topics.map(String), catalog.topics);
    if (topics) filters.topics = topics.slice(0, 8);
  }
  if (Array.isArray(parsed.keywords)) {
    const keywords = pickFromCatalog(parsed.keywords.map(String), catalog.keywords);
    if (keywords) filters.keywords = keywords.slice(0, 12);
  }
  if (Array.isArray(parsed.entities)) {
    const entities = pickFromCatalog(parsed.entities.map(String), catalog.entities);
    if (entities) filters.entities = entities.slice(0, 8);
  }
  const contentType = pickScalarFromCatalog(
    typeof parsed.contentType === 'string' ? parsed.contentType : undefined,
    catalog.contentTypes,
  );
  if (contentType) filters.contentType = contentType.slice(0, 64);

  const section = pickScalarFromCatalog(
    typeof parsed.section === 'string' ? parsed.section : undefined,
    catalog.sections,
  );
  if (section) filters.section = section.slice(0, 200);

  return filters;
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

export function hasSearchFilters(filters: SearchMetadataFilters): boolean {
  return Object.keys(filtersToVectorParams(filters)).length > 0;
}

export class MetadataQueryService {
  async extractFromQuery(
    query: string,
    options: { userId: number; documentId?: number },
  ): Promise<SearchMetadataFilters> {
    if (!metadataQueryEnabled()) {
      return {};
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      logger.debug('Metadata query extraction skipped: no OPENAI_API_KEY');
      return {};
    }

    const catalog = await loadMetadataCatalog(options.userId, options.documentId);
    if (!catalogHasValues(catalog)) {
      logger.debug({ userId: options.userId }, 'Metadata catalog empty — skip query extraction');
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
            content: buildMetadataQueryUserPrompt(query, catalog),
          },
        ],
      });

      const raw = response.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw) as SearchMetadataFilters;
      const filters = restrictFiltersToCatalog(parsed, catalog);

      logger.info(
        {
          queryPreview: query.slice(0, 80),
          filters,
          catalogSizes: {
            topics: catalog.topics.length,
            keywords: catalog.keywords.length,
            entities: catalog.entities.length,
            contentTypes: catalog.contentTypes.length,
            sections: catalog.sections.length,
          },
        },
        'Extracted metadata filters from query',
      );

      return filters;
    } catch (err) {
      logger.warn({ err }, 'Metadata query extraction failed');
      return {};
    }
  }
}
