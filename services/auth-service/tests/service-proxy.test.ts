import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { proxyPathRewrite } from '../src/lib/proxy-path.js';

describe('proxyPathRewrite', () => {
  it('restores mount path for collection routes', () => {
    assert.equal(proxyPathRewrite('/conversations', '/'), '/conversations');
  });

  it('restores mount path for nested routes', () => {
    assert.equal(proxyPathRewrite('/conversations', '/42'), '/conversations/42');
    assert.equal(
      proxyPathRewrite('/conversations', '/agent-runs/7'),
      '/conversations/agent-runs/7'
    );
  });

  it('works for other mounted services', () => {
    assert.equal(proxyPathRewrite('/documents', '/'), '/documents');
    assert.equal(proxyPathRewrite('/feedback', '/'), '/feedback');
  });
});
