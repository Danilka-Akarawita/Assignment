/**
 * Integration smoke test against running backend services.
 * Run: npm run test:integration
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const email = `fe-test-${Date.now()}@example.com`;
const password = 'TestPass123!';

let accessToken = '';

async function json(url, options = {}) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

describe('Frontend API integration', { skip: process.env.SKIP_INTEGRATION === '1' }, () => {
  before(async () => {
    const health = await json(`${API}/health`);
    if (!health.res.ok) {
      console.warn('Auth service not reachable — skipping integration tests');
      process.env.SKIP_INTEGRATION = '1';
    }
  });

  it('registers and logs in', async () => {
    const reg = await json(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    assert.ok(
      reg.res.status === 201 || reg.res.status === 400,
      `register: ${reg.res.status} ${JSON.stringify(reg.body)}`
    );

    const login = await json(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(
      login.res.status,
      200,
      `login: ${login.res.status} ${JSON.stringify(login.body)}`
    );
    accessToken = login.body.accessToken;
    assert.ok(accessToken);
  });

  it('creates conversation and sends async message', async () => {
    const create = await json(`${API}/conversations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'FE integration test' }),
    });
    assert.equal(create.res.status, 201);
    const convId = create.body.conversation.id;

    const msg = await json(`${API}/conversations/${convId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: 'Hello', async: true }),
    });
    assert.equal(msg.res.status, 202, JSON.stringify(msg.body));
    assert.equal(msg.body.status, 'queued');
    const agentRunId = msg.body.agentRunId;
    assert.ok(agentRunId);

    let agentRun = null;
    for (let i = 0; i < 120; i++) {
      const poll = await json(
        `${API}/conversations/agent-runs/${agentRunId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      assert.equal(poll.res.status, 200, JSON.stringify(poll.body));
      agentRun = poll.body.agentRun;
      if (agentRun?.status === 'COMPLETED' || agentRun?.status === 'FAILED') break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    assert.ok(agentRun, 'agent run not found after polling');
    assert.ok(
      ['COMPLETED', 'FAILED'].includes(agentRun.status),
      `unexpected status: ${agentRun.status}`
    );
  });

  it('lists knowledge documents', async () => {
    const list = await json(`${API}/documents`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.equal(list.res.status, 200);
    assert.ok(Array.isArray(list.body.documents));
  });
});
