import type { DatabaseSchemaCatalog } from '../types/tools.js';

const MAX_ROWS = parseInt(process.env.SQL_MAX_ROWS ?? '500', 10);

const STATIC_RULES = `
Role:
You are a PostgreSQL expert.

Instructions:
Generate exactly one read-only SQL query for the user's question.


Rules:
- Output ONLY a single SELECT or WITH ... SELECT statement. No markdown, no explanation in the query field.
- Never use INSERT, UPDATE, DELETE, DROP, or other write/DDL statements.
- Do not use SQL comments (-- or /* */).
- Do not access pg_catalog, information_schema, or pg_toast.
- Prefer explicit column lists over SELECT * when joining multiple tables.
- Add LIMIT ${MAX_ROWS} if the query does not already include LIMIT.
- For string filters on user-facing text, prefer ILIKE with LOWER() on both sides when appropriate.

Multi-tenant (required):
- The server binds the authenticated user's id as PostgreSQL parameter $1. Never embed a numeric user id literal in the query.
- Tables knowledge_documents and knowledge_document_chunks are per-user. ALWAYS include: WHERE ... user_id = $1 (or d.user_id = $1 when aliased).
- On knowledge_documents, status is enum DocumentStatus — always quote values: status = 'COMPLETED' (never status = COMPLETED).
- knowledge_document_chunks has no user_id column; join knowledge_documents and filter d.user_id = $1.
- For "how many documents" questions, query knowledge_documents (not chunks).

Example document count:
SELECT count(*) AS document_count
FROM knowledge_documents
WHERE user_id = $1 AND status = 'COMPLETED'

Knowledge / vectors:
- knowledge_document_chunks.embedding is pgvector. Similarity search usually needs a vector literal from the app; for counts, listings, and metadata prefer columns like chunk_text, document_id, id without vector operators unless the question is explicitly about similarity.
`.trim();

function formatTableDDL(catalog: DatabaseSchemaCatalog): string {
  const lines: string[] = [];
  for (const table of catalog.tables) {
    const cols = table.columns
      .map((c) => {
        const nullability = c.isNullable ? '' : ' NOT NULL';
        return `  ${c.name} ${c.udtName || c.dataType}${nullability}`;
      })
      .join(',\n');
    lines.push(`${table.schema}.${table.name} (\n${cols}\n)`);
  }
  return lines.join('\n\n');
}

export function buildSqlGeneratorSystemPrompt(
  catalog: DatabaseSchemaCatalog,
  _userId: number,
): string {
  const rules = STATIC_RULES;
  const schemaBlock =
    catalog.tables.length > 0
      ? `Database schema (allowed tables):\n\n${formatTableDDL(catalog)}`
      : 'No tables found in the allowed schemas.';

  return `${rules}\n\n${schemaBlock}`;
}

export function buildSqlGeneratorUserPrompt(question: string): string {
  return `Instructions:
Generate the PostgreSQL query necessary to retrieve the data the user wants:

${question.trim()}`;
}
