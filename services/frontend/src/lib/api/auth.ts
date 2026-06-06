import { config } from '@/lib/config';
import type { AuthTokens, User } from '@/lib/types';
import { apiFetch } from './http';

const base = config.apiUrl;

export async function login(email: string, password: string): Promise<AuthTokens> {
  return apiFetch(`${base}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(
  email: string,
  password: string
): Promise<AuthTokens> {
  return apiFetch(`${base}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  return apiFetch(`${base}/auth/refresh`, {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export async function getMe(accessToken: string): Promise<{ user: User }> {
  return apiFetch(`${base}/users/me`, { accessToken });
}
