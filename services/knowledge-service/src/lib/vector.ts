import type { SearchResult } from "../types/search.js";
import { prisma } from "./prisma.js";
import { logger } from "../utils/logger.js";

const EF_SEARCH = parseInt(process.env.HNSW_EF_SEARCH ?? "100", 10);

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

export async function setChunkEmbedding(
  chunkId: number,
  embedding: number[],
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE knowledge_document_chunks SET embedding = $1::vector WHERE id = $2`,
    toVectorLiteral(embedding),
    chunkId,
  );
}

export async function setHnswEfSearch(): Promise<void> {
  await prisma.$executeRawUnsafe(`SET hnsw.ef_search = ${EF_SEARCH}`);
}

export interface VectorSearchParams {
  queryEmbedding: number[];
  userId: number;
  limit: number;
  documentId?: number;
  topics?: string[];
  keywords?: string[];
  entities?: string[];
  contentType?: string;
  section?: string;
  minSimilarity?: number;
}

export async function vectorSearch(
  params: VectorSearchParams,
): Promise<SearchResult[]> {
  const {
    queryEmbedding,
    userId,
    limit,
    documentId,
    topics,
    keywords,
    entities,
    contentType,
    section,
    minSimilarity = 0,
  } = params;

  await setHnswEfSearch();

  const conditions: string[] = [
    "d.user_id = $2",
    "d.status = 'COMPLETED'",
    "c.embedding IS NOT NULL",
  ];
  const values: unknown[] = [toVectorLiteral(queryEmbedding), userId];
  let paramIndex = 3;

  if (documentId !== undefined) {
    conditions.push(`d.id = $${paramIndex}`);
    values.push(documentId);
    paramIndex++;
  }

  if (topics?.length) {
    conditions.push(`c.metadata->'topics' ?| $${paramIndex}::text[]`);
    values.push(topics);
    paramIndex++;
  }

  if (keywords?.length) {
    conditions.push(`c.metadata->'keywords' ?| $${paramIndex}::text[]`);
    values.push(keywords);
    paramIndex++;
  }

  if (entities?.length) {
    conditions.push(`c.metadata->'entities' ?| $${paramIndex}::text[]`);
    values.push(entities);
    paramIndex++;
  }

  if (contentType) {
    conditions.push(`c.metadata->>'contentType' = $${paramIndex}`);
    values.push(contentType);
    paramIndex++;
  }

  if (section) {
    conditions.push(`c.metadata->>'section' ILIKE $${paramIndex}`);
    values.push(`%${section}%`);
    paramIndex++;
  }

  if (minSimilarity > 0) {
    conditions.push(`(1 - (c.embedding <=> $1::vector)) >= $${paramIndex}`);
    values.push(minSimilarity);
    paramIndex++;
  }

  values.push(limit);

  const sql = `
    SELECT
      c.id AS chunk_id,
      c.chunk_index,
      c.chunk_text,
      c.metadata,
      d.id AS document_id,
      d.filename,
      d.title,
      1 - (c.embedding <=> $1::vector) AS similarity
    FROM knowledge_document_chunks c
    INNER JOIN knowledge_documents d ON d.id = c.document_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY c.embedding <=> $1::vector
    LIMIT $${paramIndex}
  `;

  logger.debug(
    { userId, documentId, limit, topics, keywords },
    "Running vector search",
  );

  return prisma.$queryRawUnsafe<SearchResult[]>(sql, ...values);
}

export async function deleteDocumentEmbeddings(
  documentId: number,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE knowledge_document_chunks SET embedding = NULL WHERE document_id = $1`,
    documentId,
  );
}
