
import { LlmAgent } from '@google/adk';
import { SYNTHESIS_AGENT_INSTRUCTION } from '../prompts/index.js';
import { GEMINI_MODEL } from './config.js';
import {
  beforeAgentGuard,
  synthesisAfterAgentLog,
  synthesisAfterModelJudge,
} from './callbacks/guardrails.js';

// LLMRegistry.register(OpenAILLM);


export const synthesisAgent = new LlmAgent({
  name: 'SynthesisAgent',
  model: GEMINI_MODEL,
  description: 'Produces the final user-facing answer.',
  beforeAgentCallback: beforeAgentGuard,
  afterModelCallback: synthesisAfterModelJudge,
  afterAgentCallback: synthesisAfterAgentLog,
  instruction: SYNTHESIS_AGENT_INSTRUCTION,
  outputKey: 'final_response',
});