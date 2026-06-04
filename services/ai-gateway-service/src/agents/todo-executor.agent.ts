import { LlmAgent } from '@google/adk';
import { bindInstruction } from './instruction-bind.js';
import { TODO_EXECUTOR_AGENT_INSTRUCTION } from '../prompts/index.js';
import { GEMINI_MODEL } from './config.js';
import { ensureAgentPlanInState } from './callbacks/agent-state.js';
import { beforeAgentGuard, beforeToolGuard } from './callbacks/guardrails.js';
import { AGENT_TOOLS } from './tools/remote-tools.js';

const DEFAULT_PLAN =
  '{"goal":"Answer using uploaded documents","todos":[{"position":1,"title":"Search knowledge base","description":"User question","toolHint":"knowledge_retrieval"}]}';

export const todoExecutorAgent = new LlmAgent({
  name: 'TodoExecutorAgent',
  model: GEMINI_MODEL,
  description: 'Executes todos from the generated plan.',
  tools: AGENT_TOOLS,
  beforeAgentCallback: async (context) => {
    const guard = await beforeAgentGuard(context);
    if (guard) return guard;
    return ensureAgentPlanInState(context);
  },
  beforeToolCallback: beforeToolGuard,
  instruction: bindInstruction(TODO_EXECUTOR_AGENT_INSTRUCTION, {
    agent_plan: DEFAULT_PLAN,
    user_knowledge_catalog: 'No completed uploaded documents yet.',
    user_id: '0',
  }),
  outputKey: 'execution_results',
});
