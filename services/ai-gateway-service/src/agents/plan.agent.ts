import { LlmAgent } from '@google/adk';
import { bindInstruction } from './instruction-bind.js';
import { agentPlanOutputSchema } from './output-schemas.js';
import { PLAN_AGENT_INSTRUCTION } from '../prompts/index.js';
import { GEMINI_MODEL } from './config.js';
import { beforeAgentGuard } from './callbacks/guardrails.js';

export const planAgent = new LlmAgent({
  name: 'PlanAgent',
  model: GEMINI_MODEL,
  description: 'Creates a multi-step plan and todo list for complex user requests.',
  beforeAgentCallback: beforeAgentGuard,
  instruction: bindInstruction(PLAN_AGENT_INSTRUCTION, {
    user_knowledge_catalog: 'No completed uploaded documents yet.',
    user_id: '0',
  }),
  outputSchema: agentPlanOutputSchema,
  outputKey: 'agent_plan',
});
