import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

export interface ExistingMetadataCatalog {
  topics: string[];
  keywords: string[];
  entities: string[];
  contentTypes: string[];
  sections: string[];
}

const catalogLimit = () =>
  Math.min(500, Math.max(50, parseInt(process.env.METADATA_CATALOG_LIMIT ?? '200', 10)));

function documentClause(documentId?: number): Prisma.Sql {
  return documentId !== undefined ? Prisma.sql`AND d.id = ${documentId}` : Prisma.empty;
}

async function distinctJsonArray(
  userId: number,
  documentId: number | undefined,
  field: 'topics' | 'keywords' | 'entities',
): Promise<string[]> {
  const limit = catalogLimit();
  const rows = await prisma.$queryRaw<{ value: string }[]>(
    field === 'topics'
      ? Prisma.sql`
          SELECT DISTINCT elem AS value
          FROM knowledge_document_chunks c
          INNER JOIN knowledge_documents d ON d.id = c.document_id
          CROSS JOIN LATERAL jsonb_array_elements_text(c.metadata->'topics') AS elem
          WHERE d.user_id = ${userId}
            AND d.status = 'COMPLETED'
            AND c.metadata ? 'topics'
            ${documentClause(documentId)}
          ORDER BY value
          LIMIT ${limit}
        `
      : field === 'keywords'
        ? Prisma.sql`
            SELECT DISTINCT elem AS value
            FROM knowledge_document_chunks c
            INNER JOIN knowledge_documents d ON d.id = c.document_id
            CROSS JOIN LATERAL jsonb_array_elements_text(c.metadata->'keywords') AS elem
            WHERE d.user_id = ${userId}
              AND d.status = 'COMPLETED'
              AND c.metadata ? 'keywords'
              ${documentClause(documentId)}
            ORDER BY value
            LIMIT ${limit}
          `
        : Prisma.sql`
            SELECT DISTINCT elem AS value
            FROM knowledge_document_chunks c
            INNER JOIN knowledge_documents d ON d.id = c.document_id
            CROSS JOIN LATERAL jsonb_array_elements_text(c.metadata->'entities') AS elem
            WHERE d.user_id = ${userId}
              AND d.status = 'COMPLETED'
              AND c.metadata ? 'entities'
              ${documentClause(documentId)}
            ORDER BY value
            LIMIT ${limit}
          `,
  );
  return rows.map((r) => r.value).filter(Boolean);
}

async function distinctScalar(
  userId: number,
  documentId: number | undefined,
  field: 'contentType' | 'section',
): Promise<string[]> {
  const limit = catalogLimit();
  const rows = await prisma.$queryRaw<{ value: string }[]>(
    field === 'contentType'
      ? Prisma.sql`
          SELECT DISTINCT c.metadata->>'contentType' AS value
          FROM knowledge_document_chunks c
          INNER JOIN knowledge_documents d ON d.id = c.document_id
          WHERE d.user_id = ${userId}
            AND d.status = 'COMPLETED'
            AND c.metadata->>'contentType' IS NOT NULL
            AND c.metadata->>'contentType' <> ''
            ${documentClause(documentId)}
          ORDER BY value
          LIMIT ${limit}
        `
      : Prisma.sql`
          SELECT DISTINCT c.metadata->>'section' AS value
          FROM knowledge_document_chunks c
          INNER JOIN knowledge_documents d ON d.id = c.document_id
          WHERE d.user_id = ${userId}
            AND d.status = 'COMPLETED'
            AND c.metadata->>'section' IS NOT NULL
            AND c.metadata->>'section' <> ''
            ${documentClause(documentId)}
          ORDER BY value
          LIMIT ${limit}
        `,
  );
  return rows.map((r) => r.value).filter(Boolean);
}

export function catalogHasValues(catalog: ExistingMetadataCatalog): boolean {
  return (
    catalog.topics.length > 0 ||
    catalog.keywords.length > 0 ||
    catalog.entities.length > 0 ||
    catalog.contentTypes.length > 0 ||
    catalog.sections.length > 0
  );
}

export async function loadMetadataCatalog(
  userId: number,
  documentId?: number,
): Promise<ExistingMetadataCatalog> {
  const [topics, keywords, entities, contentTypes, sections] = await Promise.all([
    distinctJsonArray(userId, documentId, 'topics'),
    distinctJsonArray(userId, documentId, 'keywords'),
    distinctJsonArray(userId, documentId, 'entities'),
    distinctScalar(userId, documentId, 'contentType'),
    distinctScalar(userId, documentId, 'section'),
  ]);

  return { topics, keywords, entities, contentTypes, sections };
}
