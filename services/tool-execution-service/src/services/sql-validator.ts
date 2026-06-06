
const FORBIDDEN_KEYWORDS =
  /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|REPLACE|MERGE|GRANT|REVOKE|COPY|CALL|EXECUTE|DO|LOCK|VACUUM|ANALYZE|REINDEX|CLUSTER|REFRESH|COMMENT|SECURITY|SET|RESET|SHOW|DISCARD|LISTEN|NOTIFY|UNLISTEN|LOAD|IMPORT|EXPORT|pg_sleep|pg_terminate_backend|dblink|lo_import|lo_export)\b/i;

const FORBIDDEN_SCHEMAS = /\b(pg_catalog|information_schema|pg_toast)\./i;

const LOCKING_READ_CLAUSE =
  /\bFOR\s+(UPDATE|NO\s+KEY\s+UPDATE|SHARE|KEY\s+SHARE)\b/i;

/** PostgreSQL SELECT ... INTO (creates/writes a table). */
const SELECT_INTO = /\bSELECT\b[\s\S]*\bINTO\b/i;

const KNOWLEDGE_TABLE_PATTERN = /\bknowledge_(documents|document_chunks)\b/i;

/** user_id must be bound via $1, never inlined as a literal. */
const USER_ID_PARAM_FILTER = /\b(?:\w+\.)?user_id\s*=\s*\$1\b/i;
const USER_ID_LITERAL_FILTER = /\b(?:\w+\.)?user_id\s*=\s*\d+/i;

export class SqlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SqlValidationError';
  }
}

export function normalizeSql(query: string): string {
  return query.trim().replace(/;\s*$/, '');
}

/**
 * Reject any non-read-only SQL before execution.
 * @throws SqlValidationError when the query is not a safe SELECT/WITH read.
 */
export function validateReadOnlySql(query: string, _userId: number): string {
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
    throw new SqlValidationError(
      'Only read-only SELECT queries are permitted (DELETE, UPDATE, INSERT, and DDL are blocked)',
    );
  }

  if (LOCKING_READ_CLAUSE.test(normalized)) {
    throw new SqlValidationError('Locking clauses (FOR UPDATE / FOR SHARE) are not permitted');
  }

  if (SELECT_INTO.test(normalized)) {
    throw new SqlValidationError('SELECT INTO (write) is not permitted');
  }

  if (FORBIDDEN_SCHEMAS.test(normalized)) {
    throw new SqlValidationError('System catalog access is not permitted');
  }

  const startsReadOnly =
    /^\s*SELECT\b/i.test(normalized) || /^\s*WITH\b/i.test(normalized);
  if (!startsReadOnly) {
    throw new SqlValidationError('Query must start with SELECT or WITH');
  }

  if (USER_ID_LITERAL_FILTER.test(normalized)) {
    throw new SqlValidationError(
      'Numeric user_id literals are not allowed; use parameter $1 (bound server-side)',
    );
  }

  if (KNOWLEDGE_TABLE_PATTERN.test(normalized)) {
    if (!USER_ID_PARAM_FILTER.test(normalized)) {
      throw new SqlValidationError(
        'Queries on knowledge tables must filter by user_id = $1 (bound server-side)',
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
