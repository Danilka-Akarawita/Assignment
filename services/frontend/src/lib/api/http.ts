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

function messageFromBody(body: unknown, status: number): string {
  if (typeof body === 'object' && body !== null) {
    const record = body as Record<string, unknown>;
    if (typeof record.error === 'string' && record.error.trim()) {
      return record.error;
    }
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message;
    }
  }
  if (status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  return `Request failed (${status})`;
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
    throw new ApiError(messageFromBody(body, res.status), res.status, body);
  }

  return body as T;
}
