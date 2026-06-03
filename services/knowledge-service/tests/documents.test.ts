import { config } from 'dotenv';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://app_user:app_pass@localhost:5432/app_db';
process.env.RABBITMQ_URL =
  process.env.TEST_RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'your-super-secret-jwt-key-change-me';

config({ override: false });

const { default: app } = await import('../src/app.js');
const { initRabbitMQ, closeRabbitMQ } = await import('../src/lib/rabbitmq.js');
const { startIngestionConsumer } = await import('../src/consumers/ingestion.consumer.js');
const { prisma } = await import('../src/lib/prisma.js');

const TEST_USER_ID = 9001;
const JWT_SECRET = process.env.JWT_SECRET!;

const accessToken = jwt.sign(
  { sub: String(TEST_USER_ID), email: 'knowledge-test@example.com', role: 'user' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const authHeader = { Authorization: `Bearer ${accessToken}` };

const sampleText = `
Refund Policy Document

Our company offers a 30-day refund policy for all purchases.
Customers may request a full refund within thirty days of purchase.
To initiate a refund, contact support@example.com with your order number.

Shipping and Returns

Standard shipping takes 5-7 business days.
Express shipping is available for an additional fee.
Returns must be in original packaging.
`.trim();

let documentId = 0;
let openaiAvailable = true;

async function checkOpenAiAvailable(): Promise<boolean> {
  try {
    const { openai, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } = await import('../src/lib/openai.js');
    await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: 'health-check',
      dimensions: EMBEDDING_DIMENSIONS,
    });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`OpenAI unavailable — skipping ingestion/search tests: ${message.slice(0, 120)}`);
    return false;
  }
}

async function waitForDocumentStatus(
  id: number,
  status: 'COMPLETED' | 'FAILED',
  timeoutMs = 180000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const doc = await prisma.document.findUnique({
      where: { id },
      select: { status: true, errorMessage: true },
    });
    if (doc?.status === status) return;
    if (doc?.status === 'FAILED') {
      throw new Error(`Ingestion failed: ${doc.errorMessage ?? 'unknown error'}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Timed out waiting for document ${id} to reach ${status}`);
}

before(async () => {
  await prisma.documentChunk.deleteMany({
    where: { document: { userId: TEST_USER_ID } },
  });
  await prisma.document.deleteMany({ where: { userId: TEST_USER_ID } });

  await initRabbitMQ();
  await startIngestionConsumer();
  openaiAvailable = await checkOpenAiAvailable();
});

after(async () => {
  await prisma.documentChunk.deleteMany({
    where: { document: { userId: TEST_USER_ID } },
  });
  await prisma.document.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.$disconnect();
  await closeRabbitMQ();
});

describe('Knowledge service endpoints', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'knowledge-service');
  });

  it('POST /documents/upload requires authentication', async () => {
    const res = await request(app)
      .post('/documents/upload')
      .attach('file', Buffer.from(sampleText), {
        filename: 'policy.txt',
        contentType: 'text/plain',
      });

    assert.equal(res.status, 401);
  });

  it('POST /documents/upload accepts a text file', async () => {
    const res = await request(app)
      .post('/documents/upload')
      .set(authHeader)
      .attach('file', Buffer.from(sampleText), {
        filename: 'refund-policy.txt',
        contentType: 'text/plain',
      });

    assert.equal(res.status, 202, JSON.stringify(res.body));
    assert.ok(res.body.document?.id);
    assert.equal(res.body.document.status, 'PENDING');

    documentId = res.body.document.id;
  });

  it('waits for document ingestion to complete', { skip: !openaiAvailable }, async () => {
    assert.ok(documentId > 0, 'documentId must be set from upload test');
    await waitForDocumentStatus(documentId, 'COMPLETED');
  });

  it('GET /documents lists user documents', async () => {
    const res = await request(app).get('/documents').set(authHeader);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.documents));
    assert.ok(res.body.documents.some((d: { id: number }) => d.id === documentId));
    assert.equal(res.body.total, res.body.documents.length);
  });

  it('GET /documents/:id returns document with chunks and metadata', { skip: !openaiAvailable }, async () => {
    const res = await request(app)
      .get(`/documents/${documentId}`)
      .set(authHeader);

    assert.equal(res.status, 200);
    assert.equal(res.body.document.id, documentId);
    assert.equal(res.body.document.status, 'COMPLETED');
    assert.ok(res.body.document.chunkCount > 0);
    assert.ok(Array.isArray(res.body.document.chunks));
    assert.ok(res.body.document.chunks.length > 0);

    const firstChunk = res.body.document.chunks[0];
    assert.ok(firstChunk.metadata);
    assert.ok(firstChunk.metadata.summary);
    assert.ok(Array.isArray(firstChunk.metadata.topics));
    assert.ok(Array.isArray(firstChunk.metadata.keywords));
  });

  it('PATCH /documents/:id/metadata updates title and tags', async () => {
    const res = await request(app)
      .patch(`/documents/${documentId}/metadata`)
      .set(authHeader)
      .send({
        title: 'Updated Refund Policy',
        tags: ['refunds', 'policy', 'test'],
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.document.title, 'Updated Refund Policy');
    assert.deepEqual(res.body.document.tags, ['refunds', 'policy', 'test']);
  });

  it('POST /documents/search returns semantic matches', { skip: !openaiAvailable }, async () => {
    const res = await request(app)
      .post('/documents/search')
      .set(authHeader)
      .send({
        query: 'What is the refund policy?',
        limit: 5,
        minSimilarity: 0.3,
      });

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.query, 'What is the refund policy?');
    assert.ok(res.body.results.length > 0);
    assert.ok(res.body.results[0].similarity > 0);
    assert.ok(res.body.results[0].chunkText.toLowerCase().includes('refund'));
  });

  it('POST /documents/search supports metadata filters', { skip: !openaiAvailable }, async () => {
    const res = await request(app)
      .post('/documents/search')
      .set(authHeader)
      .send({
        query: 'shipping delivery time',
        limit: 5,
        minSimilarity: 0.2,
        filters: {
          keywords: ['shipping'],
        },
      });

    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(Array.isArray(res.body.results));
  });

  it('POST /documents/search validates input', async () => {
    const res = await request(app)
      .post('/documents/search')
      .set(authHeader)
      .send({ query: '' });

    assert.equal(res.status, 400);
    assert.ok(Array.isArray(res.body.errors));
  });

  it('GET /documents/:id returns 404 for unknown document', async () => {
    const res = await request(app).get('/documents/999999').set(authHeader);
    assert.equal(res.status, 404);
  });

  it('DELETE /documents/:id removes the document', async () => {
    const res = await request(app)
      .delete(`/documents/${documentId}`)
      .set(authHeader);

    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'Document deleted');

    const check = await request(app)
      .get(`/documents/${documentId}`)
      .set(authHeader);
    assert.equal(check.status, 404);
  });
});
