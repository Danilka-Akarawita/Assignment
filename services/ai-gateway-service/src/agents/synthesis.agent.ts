import { LlmAgent } from '@google/adk';
import { bindInstruction } from './instruction-bind.js';
import { synthesisOutputSchema } from './output-schemas.js';
import { SYNTHESIS_AGENT_INSTRUCTION } from '../prompts/index.js';
import { GEMINI_MODEL } from './config.js';
import { ensureExecutionResultsInState } from './callbacks/agent-state.js';
import {
  beforeAgentGuard,
  synthesisAfterAgentLog,
  synthesisAfterModelJudge,
} from './callbacks/guardrails.js';

const DEFAULT_EXECUTION =
  '{"completedTodos":0,"failedTodos":0,"findings":[],"structuredData":{}}';

export const synthesisAgent = new LlmAgent({
  name: 'SynthesisAgent',
  model: GEMINI_MODEL,
  description: 'Produces the final user-facing answer.',
  beforeAgentCallback: async (context) => {
    const guard = await beforeAgentGuard(context);
    if (guard) return guard;
    return ensureExecutionResultsInState(context);
  },
  afterModelCallback: synthesisAfterModelJudge,
  afterAgentCallback: synthesisAfterAgentLog,
  instruction: bindInstruction(SYNTHESIS_AGENT_INSTRUCTION, {
    agent_plan: '{}',
    execution_results: DEFAULT_EXECUTION,
  }),
  outputSchema: synthesisOutputSchema,
  outputKey: 'final_response',
});
