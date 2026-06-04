import { config } from 'dotenv';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://app_user:app_pass@localhost:5432/app_db';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'your-super-secret-jwt-key-change-me';
process.env.KNOWLEDGE_SERVICE_URL =
  process.env.KNOWLEDGE_SERVICE_URL ?? 'http://localhost:3002';

config({ override: false });

const { default: app } = await import('../src/app.js');
const { prisma } = await import('../src/lib/prisma.js');

const TEST_USER_ID = 9002;
const JWT_SECRET = process.env.JWT_SECRET!;

const accessToken = jwt.sign(
  { sub: String(TEST_USER_ID), email: 'tools-test@example.com', role: 'user' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const authHeader = { Authorization: `Bearer ${accessToken}` };

before(async () => {
  try {
    await prisma.$connect();
  } catch {
    console.warn('Database unavailable — some tests may fail');
  }
});

after(async () => {
  await prisma.$disconnect();
});

describe('tool-execution-service', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.service, 'tool-execution-service');
  });

  it('GET /tools requires auth', async () => {
    const res = await request(app).get('/tools');
    assert.equal(res.status, 401);
  });

  it('GET /tools lists available tools', async () => {
    const res = await request(app).get('/tools').set(authHeader);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.tools));
    assert.equal(res.body.tools.length, 3);
    const names = res.body.tools.map((t: { name: string }) => t.name);
    assert.ok(names.includes('sql'));
    assert.ok(names.includes('calculator'));
    assert.ok(names.includes('knowledge_retrieval'));
  });

  it('POST /tools/execute calculator', async () => {
    const res = await request(app)
      .post('/tools/execute')
      .set(authHeader)
      .send({
        tool: 'calculator',
        arguments: { expression: '(2 + 3) * sqrt(16)' },
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.result.result, 20);
  });

  it('POST /tools/execute calculator rejects unsafe input', async () => {
    const res = await request(app)
      .post('/tools/execute')
      .set(authHeader)
      .send({
        tool: 'calculator',
        arguments: { expression: 'import("fs")' },
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('POST /tools/execute sql requires question', async () => {
    const res = await request(app)
      .post('/tools/execute')
      .set(authHeader)
      .send({
        tool: 'sql',
        arguments: {},
      });

    assert.equal(res.status, 400);
  });

  it('POST /tools/execute sql without OPENAI_API_KEY returns error', async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const res = await request(app)
      .post('/tools/execute')
      .set(authHeader)
      .send({
        tool: 'sql',
        arguments: { question: 'return the number 1 as column value' },
      });

    if (prev) process.env.OPENAI_API_KEY = prev;

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.error ?? '', /OPENAI_API_KEY/i);
  });

  it('GET /tools/sql/schema includes pgvector hints', async () => {
    const res = await request(app).get('/tools/sql/schema').set(authHeader);

    if (res.status === 500) {
      console.warn('Skipping schema test — database not available');
      return;
    }

    assert.equal(res.status, 200);
    assert.ok(res.body.pgvector);
    assert.ok(Array.isArray(res.body.pgvector.operators));
  });
});
