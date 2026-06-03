const FORBIDDEN_KEYWORDS =
  /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|REPLACE|GRANT|REVOKE|COPY|CALL|EXECUTE|DO|LOCK|VACUUM|ANALYZE|REINDEX|CLUSTER|REFRESH|COMMENT|SECURITY|SET|RESET|SHOW|DISCARD|LISTEN|NOTIFY|UNLISTEN|LOAD|COPY|IMPORT|EXPORT|pg_sleep|pg_terminate_backend|dblink|lo_import|lo_export)\b/i;

const FORBIDDEN_SCHEMAS = /\b(pg_catalog|information_schema|pg_toast)\./i;

const KNOWLEDGE_TABLE_PATTERN = /\bknowledge_(documents|document_chunks)\b/i;

export class SqlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SqlValidationError';
  }
}

export function normalizeSql(query: string): string {
  return query.trim().replace(/;\s*$/, '');
}

export function validateReadOnlySql(query: string, userId: number): string {
  const normalized = normalizeSql(query);

  if (!normalized) {
    throw new SqlValidationError('Query is empty');
  }

  if (normalized.includes(';')) {
    throw new SqlValidationError('Multiple statements are not allowed');
  }

  if (/--|\/\*/.test(normalized)) {
    throw new SqlValidationError('SQL comments are not allowed');
  }

  if (FORBIDDEN_KEYWORDS.test(normalized)) {
    throw new SqlValidationError('Only read-only SELECT queries are permitted');
  }

  if (FORBIDDEN_SCHEMAS.test(normalized)) {
    throw new SqlValidationError('System catalog access is not permitted');
  }

  const startsReadOnly =
    /^\s*SELECT\b/i.test(normalized) || /^\s*WITH\b/i.test(normalized);
  if (!startsReadOnly) {
    throw new SqlValidationError('Query must start with SELECT or WITH');
  }

  if (KNOWLEDGE_TABLE_PATTERN.test(normalized)) {
    const userFilter = new RegExp(`\\buser_id\\s*=\\s*${userId}\\b`, 'i');
    if (!userFilter.test(normalized)) {
      throw new SqlValidationError(
        `Queries on knowledge tables must filter by user_id = ${userId}`
      );
    }
  }

  return normalized;
}

export function ensureRowLimit(query: string, maxRows: number): string {
  if (/\bLIMIT\s+\d+/i.test(query)) {
    return query;
  }
  return `${query} LIMIT ${maxRows}`;
}
