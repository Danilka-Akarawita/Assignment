import { SequentialAgent } from '@google/adk';
import { planAgent } from './plan.agent.js';
import { todoExecutorAgent } from './todo-executor.agent.js';
import { synthesisAgent } from './synthesis.agent.js';

/**
 * Multi-step agent workflow (Google ADK):
 * 1. PlanAgent — plan + todo list
 * 2. TodoExecutorAgent — sequential tool execution against tool-execution-service
 * 3. SynthesisAgent — final RAG/tool-aware response
 */
export const agentWorkflow = new SequentialAgent({
  name: 'GatewayAgentWorkflow',
  description:
    'Plans tasks, executes todos with tools, and synthesizes the final chat response.',
  subAgents: [planAgent, todoExecutorAgent, synthesisAgent],
});
