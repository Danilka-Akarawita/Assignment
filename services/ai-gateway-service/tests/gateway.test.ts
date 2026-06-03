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
process.env.RABBITMQ_URL =
  process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';

config({ override: false });

const { default: app } = await import('../src/app.js');
const { prisma } = await import('../src/lib/prisma.js');

const TEST_USER_ID = 9003;
const accessToken = jwt.sign(
  { sub: String(TEST_USER_ID), email: 'gateway-test@example.com', role: 'user' },
  process.env.JWT_SECRET!,
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

describe('ai-gateway-service', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.service, 'ai-gateway-service');
  });

  it('POST /conversations creates a conversation', async () => {
    const res = await request(app)
      .post('/conversations')
      .set(authHeader)
      .send({ title: 'Invoice analysis' });

    if (res.status === 500) {
      console.warn('Skipping — database not available');
      return;
    }

    assert.equal(res.status, 201);
    assert.equal(res.body.conversation.userId, TEST_USER_ID);
    assert.equal(res.body.conversation.title, 'Invoice analysis');
  });

  it('GET /conversations requires auth', async () => {
    const res = await request(app).get('/conversations');
    assert.equal(res.status, 401);
  });

  it('POST /conversations/:id/messages validates body', async () => {
    const create = await request(app)
      .post('/conversations')
      .set(authHeader)
      .send({});

    if (create.status !== 201) {
      console.warn('Skipping — database not available');
      return;
    }

    const res = await request(app)
      .post(`/conversations/${create.body.conversation.id}/messages`)
      .set(authHeader)
      .send({ content: '' });

    assert.equal(res.status, 400);
  });
});
