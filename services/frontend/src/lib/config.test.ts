import { describe, expect, it } from 'vitest';
import { config } from './config';

describe('config', () => {
  it('uses auth-service as the single API gateway URL', () => {
    expect(config.apiUrl).toContain('3001');
  });
});
