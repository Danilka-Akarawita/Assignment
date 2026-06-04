import { Type, type Schema } from '@google/genai';

export const agentPlanOutputSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    goal: {
      type: Type.STRING,
      description: 'One sentence goal for the user request.',
    },
    todos: {
      type: Type.ARRAY,
      description: 'Ordered execution steps (1-7 items).',
      items: {
        type: Type.OBJECT,
        properties: {
          position: { type: Type.NUMBER, description: '1-based step number.' },
          title: { type: Type.STRING, description: 'Short step title.' },
          description: { type: Type.STRING, description: 'Detailed step description.' },
          toolHint: {
            type: Type.STRING,
            description:
              'knowledge_retrieval | sql_query | calculator | none',
          },
        },
        required: ['position', 'title'],
      },
    },
  },
  required: ['goal', 'todos'],
};

export const queryRewriteOutputSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    resolvedQuery: {
      type: Type.STRING,
      description: 'Standalone rewritten user request.',
    },
    historySummary: {
      type: Type.STRING,
      description: 'Updated concise conversation summary.',
    },
  },
  required: ['resolvedQuery', 'historySummary'],
};

export const synthesisOutputSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    answer: {
      type: Type.STRING,
      description: 'Final user-facing response (markdown allowed).',
    },
    limitations: {
      type: Type.STRING,
      description: 'Optional note when information is missing.',
    },
  },
  required: ['answer'],
};

export const answerJudgeOutputSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.NUMBER,
      description: 'Quality score from 0.0 to 1.0.',
    },
    verdict: {
      type: Type.STRING,
      description: 'correct | partial | wrong',
    },
    reason: {
      type: Type.STRING,
      description: 'One short sentence explaining the verdict.',
    },
  },
  required: ['score', 'verdict', 'reason'],
};
