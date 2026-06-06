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
- Use the schema below: for any table with a user_id column, always scope the query with user_id = $1 (or alias.user_id = $1 when aliased).
- For tables without user_id, join to a related table that has user_id and filter on that table's user_id = $1.
- When filtering enum columns, always quote values as string literals (e.g. status = 'COMPLETED', never bare status = COMPLETED).
- For count or aggregate questions about a parent entity, query the parent table (the one that owns user_id), not child/detail tables, unless the question is explicitly about child rows.

Example scoped count:
SELECT count(*) AS item_count
FROM some_table
WHERE user_id = $1 AND status = 'COMPLETED'

Knowledge / vectors:
- Columns typed as vector (pgvector) usually need a vector literal from the app for similarity search; for counts, listings, and metadata prefer non-vector columns unless the question is explicitly about similarity.
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
