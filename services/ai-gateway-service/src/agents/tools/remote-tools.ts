import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import {
  CALCULATOR_TOOL_DESCRIPTION,
  KNOWLEDGE_RETRIEVAL_TOOL_DESCRIPTION,
  SQL_QUERY_TOOL_DESCRIPTION,
  UPDATE_TODO_STATUS_TOOL_DESCRIPTION,
} from '../../prompts/index.js';
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
  description: KNOWLEDGE_RETRIEVAL_TOOL_DESCRIPTION,
  parameters: knowledgeParams as never,
  execute: async (input: unknown) => {
    const { query, limit, documentId, minSimilarity } = knowledgeParams.parse(input);
    const args: Record<string, unknown> = {
      query,
      minSimilarity: minSimilarity ?? 0.25,
    };
    if (limit !== undefined) args.limit = limit;
    if (documentId !== undefined) args.documentId = documentId;
    return executeRemoteTool('knowledge_retrieval', args);
  },
});

const sqlParams = z.object({
  question: z
    .string()
    .describe(
      'Clear natural language data question, e.g. count completed knowledge documents for this user',
    ),
});

export const sqlQueryTool = new FunctionTool({
  name: 'sql_query',
  description: SQL_QUERY_TOOL_DESCRIPTION,
  parameters: sqlParams as never,
  execute: async (input: unknown) => {
    const { question } = sqlParams.parse(input);
    return executeRemoteTool('sql', { question });
  },
});

const calculatorParams = z.object({
  expression: z.string().describe('Math expression e.g. (100 + 50) * 1.2'),
});

export const calculatorTool = new FunctionTool({
  name: 'calculator',
  description: CALCULATOR_TOOL_DESCRIPTION,
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
  description: UPDATE_TODO_STATUS_TOOL_DESCRIPTION,
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
