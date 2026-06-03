import { describe, expect, it, vi, afterEach } from 'vitest';
import { ApiError, apiFetch } from './http';

describe('apiFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed JSON on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ ok: true }),
      })
    );

    const result = await apiFetch<{ ok: boolean }>('http://example.com/test');
    expect(result.ok).toBe(true);
  });

  it('throws ApiError with message from body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: 'Invalid credentials' }),
      })
    );

    await expect(apiFetch('http://example.com/auth')).rejects.toMatchObject({
      message: 'Invalid credentials',
      status: 401,
    } satisfies Partial<ApiError>);
  });
});
