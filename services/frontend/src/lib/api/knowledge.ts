import { config } from '@/lib/config';
import type { KnowledgeDocument } from '@/lib/types';
import { apiFetch } from './http';

const base = config.apiUrl;

export async function listDocuments(
  accessToken: string
): Promise<{ documents: KnowledgeDocument[]; total: number }> {
  return apiFetch(`${base}/documents`, { accessToken });
}

export async function getDocument(
  accessToken: string,
  id: number
): Promise<{ document: KnowledgeDocument & { chunks?: unknown[] } }> {
  return apiFetch(`${base}/documents/${id}`, { accessToken });
}

export async function uploadDocument(
  accessToken: string,
  file: File
): Promise<{ message: string; document: KnowledgeDocument }> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${base}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? `Upload failed (${res.status})`);
  }
  return body;
}

export async function deleteDocument(
  accessToken: string,
  id: number
): Promise<{ message: string }> {
  return apiFetch(`${base}/documents/${id}`, {
    method: 'DELETE',
    accessToken,
  });
}

export async function searchDocuments(
  accessToken: string,
  query: string,
  limit = 5
): Promise<{
  query: string;
  total: number;
  results: Array<{
    chunkText: string;
    title: string | null;
    similarity: number;
    documentId: number;
  }>;
}> {
  return apiFetch(`${base}/documents/search`, {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ query, limit }),
  });
}
