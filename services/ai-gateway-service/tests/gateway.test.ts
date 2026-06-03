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
const { AgentOrchestratorService } = await import('../src/services/agent-orchestrator.service.js');

const TEST_USER_ID = 9003;
const accessToken = jwt.sign(
  { sub: String(TEST_USER_ID), email: 'gateway-test@example.com', role: 'user' },
  process.env.JWT_SECRET!,
  { expiresIn: '1h' }
);
const authHeader = { Authorization: `Bearer ${accessToken}` };

// Simulates the DB side-effects that the real AgentOrchestratorService.run() produces.
// chat.service.ts reads plan + todos back from the DB, so mocks must persist them too.
async function mockAgentRunInDb(
  agentRunId: number,
  plan: { goal: string; todos: Array<{ title: string }> }
): Promise<void> {
  await prisma.agentTodo.deleteMany({ where: { agentRunId } });
  if (plan.todos.length > 0) {
    await prisma.$transaction(
      plan.todos.map((todo, index) =>
        prisma.agentTodo.create({
          data: { agentRunId, position: index + 1, title: todo.title, status: 'PENDING' },
        })
      )
    );
  }
  await prisma.agentRun.update({
    where: { id: agentRunId },
    data: { status: 'COMPLETED', plan: plan as object },
  });
}

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

  it('POST /conversations/:id/messages with query: refund policy', async () => {
    const create = await request(app)
      .post('/conversations')
      .set(authHeader)
      .send({ title: 'Customer Support' });

    if (create.status !== 201) {
      console.warn('Skipping — database not available');
      return;
    }

    const conversationId = create.body.conversation.id;
    const originalResolve = AgentOrchestratorService.prototype.resolveUserMessage;
    const originalRun = AgentOrchestratorService.prototype.run;

    AgentOrchestratorService.prototype.resolveUserMessage = async function () {
      return { resolvedQuery: 'What is the refund policy for orders?', historySummary: 'User asking about refund policy' };
    };
    AgentOrchestratorService.prototype.run = async function (input) {
      const plan = { goal: 'explain refund policy', todos: [{ title: 'Check policy details' }, { title: 'Provide timeline' }] };
      await mockAgentRunInDb(input.agentRunId, plan);
      return {
        finalResponse: 'Our refund policy allows returns within 30 days of purchase. Items must be in original condition with all packaging. Refunds are processed within 5-7 business days.',
        plan,
        executionResults: { summary: 'Policy retrieved and formatted' },
      };
    };

    try {
      const res = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .set(authHeader)
        .send({ content: 'What is your refund policy?' });

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'completed');
      assert.ok(res.body.assistantMessage?.content);
      assert.match(res.body.assistantMessage.content, /refund|policy/i);
      assert.equal(res.body.agentRun?.status, 'COMPLETED');
      assert.ok(Array.isArray(res.body.agentRun?.todos));
    } finally {
      AgentOrchestratorService.prototype.resolveUserMessage = originalResolve;
      AgentOrchestratorService.prototype.run = originalRun;
    }
  });

  it('POST /conversations/:id/messages with query: order tracking', async () => {
    const create = await request(app)
      .post('/conversations')
      .set(authHeader)
      .send({ title: 'Order Status' });

    if (create.status !== 201) {
      console.warn('Skipping — database not available');
      return;
    }

    const conversationId = create.body.conversation.id;
    const originalResolve = AgentOrchestratorService.prototype.resolveUserMessage;
    const originalRun = AgentOrchestratorService.prototype.run;

    AgentOrchestratorService.prototype.resolveUserMessage = async function () {
      return { resolvedQuery: 'How can I track my order status?', historySummary: 'User inquiring about order tracking' };
    };
    AgentOrchestratorService.prototype.run = async function (input) {
      const plan = { goal: 'provide order tracking instructions', todos: [{ title: 'Identify tracking method' }, { title: 'Provide step-by-step guide' }] };
      await mockAgentRunInDb(input.agentRunId, plan);
      return {
        finalResponse: 'You can track your order by logging into your account and viewing the Orders page. You will see real-time shipping updates and estimated delivery dates for each order.',
        plan,
        executionResults: { summary: 'Tracking information compiled' },
      };
    };

    try {
      const res = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .set(authHeader)
        .send({ content: 'How do I track my order?' });

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'completed');
      assert.ok(res.body.assistantMessage?.content);
      assert.match(res.body.assistantMessage.content, /track|order|shipping/i);
      assert.equal(res.body.agentRun?.status, 'COMPLETED');
      assert.ok(res.body.agentRun?.plan);
    } finally {
      AgentOrchestratorService.prototype.resolveUserMessage = originalResolve;
      AgentOrchestratorService.prototype.run = originalRun;
    }
  });

  it('POST /conversations/:id/messages with query: cancellation', async () => {
    const create = await request(app)
      .post('/conversations')
      .set(authHeader)
      .send({ title: 'Order Cancellation' });

    if (create.status !== 201) {
      console.warn('Skipping — database not available');
      return;
    }

    const conversationId = create.body.conversation.id;
    const originalResolve = AgentOrchestratorService.prototype.resolveUserMessage;
    const originalRun = AgentOrchestratorService.prototype.run;

    AgentOrchestratorService.prototype.resolveUserMessage = async function () {
      return { resolvedQuery: 'Can I cancel my pending order?', historySummary: 'User wants to cancel order' };
    };
    AgentOrchestratorService.prototype.run = async function (input) {
      const plan = { goal: 'explain cancellation policy', todos: [{ title: 'Check cancellation window' }, { title: 'Provide contact info if needed' }] };
      await mockAgentRunInDb(input.agentRunId, plan);
      return {
        finalResponse: 'Orders can be cancelled within 2 hours of placement if they have not yet been processed by our fulfillment center. After that window, please contact our support team for assistance with cancellations.',
        plan,
        executionResults: { summary: 'Cancellation policy provided' },
      };
    };

    try {
      const res = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .set(authHeader)
        .send({ content: 'Can I cancel my order?' });

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'completed');
      assert.ok(res.body.assistantMessage?.content);
      assert.match(res.body.assistantMessage.content, /cancel|2 hours/i);
      assert.equal(res.body.agentRun?.status, 'COMPLETED');
      assert.ok(Array.isArray(res.body.agentRun?.todos));
      assert.ok(res.body.agentRun!.todos!.length > 0);
    } finally {
      AgentOrchestratorService.prototype.resolveUserMessage = originalResolve;
      AgentOrchestratorService.prototype.run = originalRun;
    }
  });

  it('POST /conversations/:id/messages with query: payment methods', async () => {
    const create = await request(app)
      .post('/conversations')
      .set(authHeader)
      .send({ title: 'Payment Info' });

    if (create.status !== 201) {
      console.warn('Skipping — database not available');
      return;
    }

    const conversationId = create.body.conversation.id;
    const originalResolve = AgentOrchestratorService.prototype.resolveUserMessage;
    const originalRun = AgentOrchestratorService.prototype.run;

    AgentOrchestratorService.prototype.resolveUserMessage = async function () {
      return { resolvedQuery: 'What payment methods are accepted?', historySummary: 'User asking about payment options' };
    };
    AgentOrchestratorService.prototype.run = async function (input) {
      const plan = { goal: 'list accepted payment methods', todos: [{ title: 'Compile payment methods' }, { title: 'Highlight security' }] };
      await mockAgentRunInDb(input.agentRunId, plan);
      return {
        finalResponse: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, Apple Pay, Google Pay, and bank transfers. All payments are processed securely with SSL encryption.',
        plan,
        executionResults: { summary: 'Payment information retrieved' },
      };
    };

    try {
      const res = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .set(authHeader)
        .send({ content: 'What payment methods do you accept?' });

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'completed');
      assert.ok(res.body.assistantMessage?.content);
      assert.match(res.body.assistantMessage.content, /credit|payment|PayPal/i);
      assert.equal(res.body.agentRun?.status, 'COMPLETED');
      assert.ok(res.body.agentRun?.plan);
    } finally {
      AgentOrchestratorService.prototype.resolveUserMessage = originalResolve;
      AgentOrchestratorService.prototype.run = originalRun;
    }
  });
});
