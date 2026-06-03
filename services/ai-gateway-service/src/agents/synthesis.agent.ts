
import { LlmAgent,LLMRegistry } from '@google/adk';
import { GPT_MODEL,GEMINI_MODEL } from './config.js';
import { OpenAILLM } from './openai-llm.js';

// LLMRegistry.register(OpenAILLM);


export const synthesisAgent = new LlmAgent({
  name: 'SynthesisAgent',
  model: GEMINI_MODEL,
  description: 'Produces the final user-facing answer.',
  instruction: `
You are the final response agent.

Original user request is available in the conversation.

Plan:
{agent_plan}

Execution Results:
{execution_results}

Generate the final answer for the user.

Requirements:
- Answer the user's request directly.
- Use facts from execution_results.
- Include important numbers, totals, dates, or findings.
- Mention limitations if information is missing.
- Use markdown when helpful.
- Be concise but complete.

Output only the final user response.
`,
  outputKey: 'final_response',
});