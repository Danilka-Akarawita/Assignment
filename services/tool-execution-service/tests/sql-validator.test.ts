import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SqlValidationError,
  validateReadOnlySql,
} from '../src/services/sql-validator.js';

describe('sql-validator', () => {
  it('rejects write queries', () => {
    assert.throws(
      () => validateReadOnlySql('DELETE FROM knowledge_documents', 1),
      SqlValidationError,
    );
  });

  it('requires user_id on knowledge tables', () => {
    assert.throws(
      () =>
        validateReadOnlySql(
          'SELECT id FROM knowledge_documents LIMIT 10',
          42,
        ),
      SqlValidationError,
    );
  });

  it('allows read query with user filter', () => {
    const sql = validateReadOnlySql(
      'SELECT id FROM knowledge_documents WHERE user_id = 42 LIMIT 5',
      42,
    );
    assert.match(sql, /user_id\s*=\s*42/i);
  });

  it('rejects UPDATE even when disguised in a longer statement', () => {
    assert.throws(
      () =>
        validateReadOnlySql(
          'UPDATE knowledge_documents SET status = \'FAILED\' WHERE user_id = 1',
          1,
        ),
      SqlValidationError,
    );
  });

  it('rejects INSERT', () => {
    assert.throws(
      () =>
        validateReadOnlySql(
          'INSERT INTO knowledge_documents (user_id, filename) VALUES (1, \'x.pdf\')',
          1,
        ),
      SqlValidationError,
    );
  });

  it('rejects DROP', () => {
    assert.throws(
      () => validateReadOnlySql('DROP TABLE knowledge_documents', 1),
      SqlValidationError,
    );
  });

  it('rejects SELECT FOR UPDATE', () => {
    assert.throws(
      () =>
        validateReadOnlySql(
          'SELECT id FROM gateway_conversations WHERE user_id = 1 FOR UPDATE',
          1,
        ),
      SqlValidationError,
    );
  });

  it('rejects SELECT INTO', () => {
    assert.throws(
      () =>
        validateReadOnlySql(
          'SELECT id INTO TEMP TABLE stolen FROM knowledge_documents WHERE user_id = 1',
          1,
        ),
      SqlValidationError,
    );
  });

  it('allows WITH ... SELECT', () => {
    const sql = validateReadOnlySql(
      'WITH c AS (SELECT id FROM knowledge_documents WHERE user_id = 42) SELECT count(*) FROM c',
      42,
    );
    assert.match(sql, /^WITH\b/i);
  });
});
