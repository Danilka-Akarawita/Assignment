import { config } from 'dotenv';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://app_user:app_pass@localhost:5432/app_db';
process.env.RABBITMQ_URL =
  process.env.TEST_RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';

config({ override: false });

const { default: app } = await import('../src/app.js');
const { initRabbitMQ, closeRabbitMQ } = await import('../src/lib/rabbitmq.js');
const { prisma } = await import('../src/lib/prisma.js');

const testEmail = `test-${Date.now()}@example.com`;
const adminEmail = `admin-${Date.now()}@example.com`;
const password = 'secret123';

let accessToken = '';
let refreshToken = '';
let adminAccessToken = '';

before(async () => {
  await prisma.refreshToken.deleteMany({
    where: {
      user: { email: { in: [testEmail, adminEmail] } },
    },
  });
  await prisma.user.deleteMany({
    where: { email: { in: [testEmail, adminEmail] } },
  });
  await initRabbitMQ();
});

after(async () => {
  await prisma.refreshToken.deleteMany({
    where: {
      user: { email: { in: [testEmail, adminEmail] } },
    },
  });
  await prisma.user.deleteMany({
    where: { email: { in: [testEmail, adminEmail] } },
  });
  await prisma.$disconnect();
  await closeRabbitMQ();
});

describe('Auth service endpoints', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });

  it('POST /auth/register creates a user', async () => {
    const res = await request(app).post('/auth/register').send({
      email: testEmail,
      password,
    });

    assert.equal(
      res.status,
      201,
      `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`
    );
    assert.ok(res.body.accessToken);
    assert.ok(res.body.refreshToken);

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('POST /auth/register rejects duplicate email', async () => {
    const res = await request(app).post('/auth/register').send({
      email: testEmail,
      password,
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'User already exists');
  });

  it('POST /auth/register validates input', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'not-an-email',
      password: '123',
    });

    assert.equal(res.status, 400);
    assert.ok(Array.isArray(res.body.errors));
  });

  it('POST /auth/login authenticates a user', async () => {
    const res = await request(app).post('/auth/login').send({
      email: testEmail,
      password,
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.accessToken);
    assert.ok(res.body.refreshToken);

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('POST /auth/login rejects invalid credentials', async () => {
    const res = await request(app).post('/auth/login').send({
      email: testEmail,
      password: 'wrong-password',
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Invalid credentials');
  });

  it('POST /auth/refresh requires a refresh token', async () => {
    const res = await request(app).post('/auth/refresh').send({});

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Refresh token required');
  });

  it('POST /auth/refresh returns new tokens', async () => {
    const res = await request(app).post('/auth/refresh').send({ refreshToken });

    assert.equal(res.status, 200);
    assert.ok(res.body.accessToken);
    assert.ok(res.body.refreshToken);

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('GET /users/me requires authentication', async () => {
    const res = await request(app).get('/users/me');

    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'No token provided');
  });

  it('GET /users/me returns the current user', async () => {
    const res = await request(app)
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, testEmail);
    assert.equal(res.body.user.role, 'user');
  });

  it('GET /users/admin denies non-admin users', async () => {
    const res = await request(app)
      .get('/users/admin')
      .set('Authorization', `Bearer ${accessToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'Insufficient permissions');
  });

  it('GET /users/admin allows admin users', async () => {
    const registerRes = await request(app).post('/auth/register').send({
      email: adminEmail,
      password,
      role: 'admin',
    });

    assert.equal(registerRes.status, 201);
    adminAccessToken = registerRes.body.accessToken;

    const res = await request(app)
      .get('/users/admin')
      .set('Authorization', `Bearer ${adminAccessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'Admin access granted');
  });
});
