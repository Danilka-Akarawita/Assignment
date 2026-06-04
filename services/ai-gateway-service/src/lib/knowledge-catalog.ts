import { listKnowledgeDocuments, type KnowledgeDocumentSummary } from './knowledge-client.js';

export function formatKnowledgeCatalog(documents: KnowledgeDocumentSummary[]): string {
  const ready = documents.filter((d) => d.status === 'COMPLETED' && d.chunkCount > 0);

  if (ready.length === 0) {
    return 'No completed uploaded documents yet.';
  }

  return ready
    .map((d) => {
      const label = d.title ?? d.filename;
      const summary = d.summary?.trim();
      return `- id=${d.id} "${label}" (${d.chunkCount} chunks)${summary ? `: ${summary.slice(0, 240)}` : ''}`;
    })
    .join('\n');
}

export async function buildKnowledgeCatalogForAgent(authToken: string): Promise<string> {
  const documents = await listKnowledgeDocuments(authToken);
  return formatKnowledgeCatalog(documents);
}
