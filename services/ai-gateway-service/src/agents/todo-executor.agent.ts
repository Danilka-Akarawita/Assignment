import { LlmAgent } from '@google/adk';
import { TODO_EXECUTOR_AGENT_INSTRUCTION } from '../prompts/index.js';
import { GEMINI_MODEL } from './config.js';
import { beforeAgentGuard, beforeToolGuard } from './callbacks/guardrails.js';
import { AGENT_TOOLS } from './tools/remote-tools.js';

export const todoExecutorAgent = new LlmAgent({
  name: 'TodoExecutorAgent',
  model: GEMINI_MODEL,
  description: 'Executes todos from the generated plan.',
  tools: AGENT_TOOLS,
  beforeAgentCallback: beforeAgentGuard,
  beforeToolCallback: beforeToolGuard,
  instruction: TODO_EXECUTOR_AGENT_INSTRUCTION,
  outputKey: 'execution_results',
});