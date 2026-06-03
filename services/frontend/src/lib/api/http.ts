export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit & { accessToken?: string | null } = {}
): Promise<T> {
  const { accessToken, headers, ...rest } = options;
  const res = await fetch(url, {
    ...rest,
    headers: {
      ...(headers as Record<string, string>),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(rest.body && !(headers as Record<string, string>)?.['Content-Type']
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
  });

  const text = await res.text();
  let body: unknown = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }

  if (!res.ok) {
    const err =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: string }).error)
        : `Request failed (${res.status})`;
    throw new ApiError(err, res.status, body);
  }

  return body as T;
}
