import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { executeRemoteTool } from '../../services/tool-client.service.js';
import { todoTracker } from '../../services/todo-tracker.service.js';

const knowledgeParams = z.object({
  query: z.string().describe('Natural language search query'),
  limit: z.number().int().min(1).max(50).optional().describe('Max chunks to return'),
  documentId: z.number().int().positive().optional(),
  minSimilarity: z.number().min(0).max(1).optional(),
});

export const knowledgeRetrievalTool = new FunctionTool({
  name: 'knowledge_retrieval',
  description:
    'Semantic search over the user uploaded documents (invoices, policies, etc.). Use for RAG retrieval.',
  parameters: knowledgeParams as never,
  execute: async (input: unknown) => {
    const { query, limit, documentId, minSimilarity } = knowledgeParams.parse(input);
    const args: Record<string, unknown> = { query };
    if (limit !== undefined) args.limit = limit;
    if (documentId !== undefined) args.documentId = documentId;
    if (minSimilarity !== undefined) args.minSimilarity = minSimilarity;
    return executeRemoteTool('knowledge_retrieval', args);
  },
});

const sqlParams = z.object({
  query: z.string().describe('Read-only SELECT or WITH query'),
});

export const sqlQueryTool = new FunctionTool({
  name: 'sql_query',
  description:
    'Run a read-only SQL SELECT. When querying knowledge_documents or knowledge_document_chunks you MUST filter by user_id from session context.',
  parameters: sqlParams as never,
  execute: async (input: unknown) => {
    const { query } = sqlParams.parse(input);
    return executeRemoteTool('sql', { query });
  },
});

const calculatorParams = z.object({
  expression: z.string().describe('Math expression e.g. (100 + 50) * 1.2'),
});

export const calculatorTool = new FunctionTool({
  name: 'calculator',
  description: 'Evaluate a mathematical expression and return a numeric result.',
  parameters: calculatorParams as never,
  execute: async (input: unknown) => {
    const { expression } = calculatorParams.parse(input);
    return executeRemoteTool('calculator', { expression });
  },
});

const todoParams = z.object({
  position: z.number().int().min(1).describe('1-based todo position from the plan'),
  status: z.enum(['in_progress', 'completed', 'failed', 'skipped']),
  resultSummary: z.string().optional().describe('Short summary of step outcome'),
});

export const updateTodoStatusTool = new FunctionTool({
  name: 'update_todo_status',
  description:
    'Update a todo item status in the plan tracker. Call when starting or finishing a step.',
  parameters: todoParams as never,
  execute: async (input: unknown) => {
    const { position, status, resultSummary } = todoParams.parse(input);
    const result = await todoTracker.updateFromContext(position, status, resultSummary);
    return { ...result, position, status };
  },
});

export const AGENT_TOOLS = [
  knowledgeRetrievalTool,
  sqlQueryTool,
  calculatorTool,
  updateTodoStatusTool,
];
