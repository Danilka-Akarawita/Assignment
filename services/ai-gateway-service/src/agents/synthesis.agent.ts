import { LlmAgent,LLMRegistry } from '@google/adk';
import { GPT_MODEL,GEMINI_MODEL } from './config.js';
import { OpenAILLM } from './openai-llm.js';

// LLMRegistry.register(OpenAILLM);

export const synthesisAgent = new LlmAgent({
  name: 'SynthesisAgent',
  model: GEMINI_MODEL,
  description: 'Produces the final user-facing answer from plan and execution results.',
  instruction: `You are the final response agent.

Original user request is in the conversation.

Plan:
{agent_plan}

Execution summary:
{execution_results}

Write a clear, helpful final answer for the user. Include:
- Direct answer to their question
- Key numbers or facts from execution
- Brief mention of steps taken if helpful
- Caveats if data was incomplete

Use markdown when appropriate. Be concise and accurate.`,
  outputKey: 'final_response',
});
