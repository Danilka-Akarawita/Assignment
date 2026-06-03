import { describe, expect, it } from 'vitest';
import { config } from './config';

describe('config', () => {
  it('has default API URLs', () => {
    expect(config.authApiUrl).toContain('3001');
    expect(config.gatewayApiUrl).toContain('3004');
    expect(config.knowledgeApiUrl).toContain('3002');
  });
});
