import {
  CALCULATOR_EXPRESSION_PARAM_DESCRIPTION,
  CALCULATOR_TOOL_DESCRIPTION,
  KNOWLEDGE_RETRIEVAL_TOOL_DESCRIPTION,
  SQL_QUESTION_PARAM_DESCRIPTION,
  SQL_TOOL_DESCRIPTION,
} from '../prompts/index.js';
import type { ToolDefinition } from '../types/tools.js';

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'sql',
    description: SQL_TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object',
      required: ['question'],
      properties: {
        question: {
          type: 'string',
          description: SQL_QUESTION_PARAM_DESCRIPTION,
        },
      },
    },
  },
  {
    name: 'calculator',
    description: CALCULATOR_TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object',
      required: ['expression'],
      properties: {
        expression: {
          type: 'string',
          description: CALCULATOR_EXPRESSION_PARAM_DESCRIPTION,
        },
      },
    },
  },
  {
    name: 'knowledge_retrieval',
    description: KNOWLEDGE_RETRIEVAL_TOOL_DESCRIPTION,
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
