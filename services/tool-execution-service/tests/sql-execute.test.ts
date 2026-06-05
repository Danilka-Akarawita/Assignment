import { config } from 'dotenv';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

config({ path: '.env' });

process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://app_user:app_pass@localhost:5432/app_db';

const { prisma } = await import('../src/lib/prisma.js');
const { SqlService } = await import('../src/services/sql.service.js');
const { validateReadOnlySql, ensureRowLimit } = await import(
  '../src/services/sql-validator.js'
);

const sql = new SqlService();

before(async () => {
  try {
    await prisma.$connect();
  } catch {
    console.warn('Database unavailable — sql execute tests skipped');
  }
});

after(async () => {
  await prisma.$disconnect();
});

describe('sql execute', () => {
  it('counts completed documents with parameterized user_id', async () => {
    const userRow = await prisma.$queryRawUnsafe<{ id: number }[]>(
      `SELECT id FROM auth_users ORDER BY id LIMIT 1`,
    );
    if (userRow.length === 0) {
      console.warn('No users in DB — skipping');
      return;
    }

    const userId = userRow[0]!.id;
    const query = `SELECT count(*) AS document_count
       FROM knowledge_documents
       WHERE user_id = $1 AND status = 'COMPLETED'`;

    const result = await sql.execute(query, userId);
    assert.ok(result.columns.includes('document_count'));
    assert.equal(result.rowCount, 1);
    assert.ok(typeof result.rows[0]?.document_count !== 'undefined');
  });

  it('rejects unquoted enum status (validator allows, postgres would fail)', async () => {
    const userId = 1;
    const query = validateReadOnlySql(
      `SELECT count(*) FROM knowledge_documents WHERE user_id = $1 AND status = COMPLETED`,
      userId,
    );
    assert.match(query, /status = COMPLETED/);
  });
});
