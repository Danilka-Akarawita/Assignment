import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { agentRunHub } from '../src/ws/agent-run-hub.js';

describe('agentRunHub', () => {
  it('delivers published events to subscribers', () => {
    const events: unknown[] = [];
    const unsubscribe = agentRunHub.subscribe(42, (event) => {
      events.push(event);
    });

    agentRunHub.publish(42, {
      type: 'run.updated',
      agentRun: { id: 42, status: 'PLANNING' },
    });

    assert.equal(events.length, 1);
    assert.equal((events[0] as { type: string }).type, 'run.updated');
    unsubscribe();
  });

  it('does not deliver events to other run subscriptions', () => {
    const events: unknown[] = [];
    const unsubscribe = agentRunHub.subscribe(1, (event) => {
      events.push(event);
    });

    agentRunHub.publish(2, {
      type: 'run.updated',
      agentRun: { id: 2, status: 'EXECUTING' },
    });

    assert.equal(events.length, 0);
    unsubscribe();
  });
});
