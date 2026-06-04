import type { SingleAgentCallback } from '@google/adk';
import { logger } from '../../utils/logger.js';

const FALLBACK_PLAN = (userQuery: string) =>
  JSON.stringify({
    goal: 'Answer the user using uploaded documents',
    todos: [
      {
        position: 1,
        title: 'Search knowledge base',
        description: userQuery,
        toolHint: 'knowledge_retrieval',
      },
    ],
  });

const EMPTY_EXECUTION = JSON.stringify({
  completedTodos: 0,
  failedTodos: 0,
  findings: [],
  structuredData: {},
});

function hasStateValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value).trim();
  return text.length > 0 && text !== '{}' && text !== '""';
}

/** Run before TodoExecutor when PlanAgent output did not land in session state. */
export const ensureAgentPlanInState: SingleAgentCallback = async (context) => {
  if (hasStateValue(context.state.get('agent_plan'))) return undefined;

  const userQuery = context.state.get<string>('user_query') ?? 'Answer the user question';
  context.state.set('agent_plan', FALLBACK_PLAN(userQuery));
  logger.warn(
    { agent: context.agentName },
    'agent_plan missing after PlanAgent; injected fallback plan'
  );
  return undefined;
};

/** Run before SynthesisAgent when executor output did not land in session state. */
export const ensureExecutionResultsInState: SingleAgentCallback = async (context) => {
  if (hasStateValue(context.state.get('execution_results'))) return undefined;

  context.state.set('execution_results', EMPTY_EXECUTION);
  logger.warn(
    { agent: context.agentName },
    'execution_results missing after TodoExecutor; injected empty results'
  );
  return undefined;
};
