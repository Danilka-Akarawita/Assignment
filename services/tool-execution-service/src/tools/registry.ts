import type { ToolDefinition } from '../types/tools.js';

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'sql',
    description:
      'Execute a read-only SQL SELECT against the application database. Knowledge tables require user_id filter.',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', description: 'Read-only SELECT or WITH ... SELECT' },
      },
    },
  },
  {
    name: 'calculator',
    description: 'Evaluate a mathematical expression safely (numeric result).',
    inputSchema: {
      type: 'object',
      required: ['expression'],
      properties: {
        expression: {
          type: 'string',
          description: 'Math expression, e.g. "(2 + 3) * sqrt(16)"',
        },
      },
    },
  },
  {
    name: 'knowledge_retrieval',
    description:
      'Semantic search over ingested documents via the knowledge service (pgvector-backed).',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        documentId: { type: 'integer' },
        minSimilarity: { type: 'number', minimum: 0, maximum: 1, default: 0.5 },
        filters: {
          type: 'object',
          properties: {
            topics: { type: 'array', items: { type: 'string' } },
            keywords: { type: 'array', items: { type: 'string' } },
            contentType: { type: 'string' },
            section: { type: 'string' },
            entities: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  },
];
