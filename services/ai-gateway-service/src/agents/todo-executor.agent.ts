import { LlmAgent } from '@google/adk';
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
  instruction: `
You are an execution agent.

Plan:
{agent_plan}

User ID:
{user_id}

Instructions:

1. Read the todos from agent_plan.
2. Execute them in order.
3. Select the appropriate tool based on toolHint.
4. Reuse findings from earlier steps when helpful.
5. For document analysis:
   - Retrieve documents first.
   - Extract relevant facts.
   - Perform calculations if needed.
6. For database analysis:
   - Use sql_query.
   - Always apply user_id filtering when querying user-owned data.
7. For calculations:
   - Use calculator instead of mental math.

Output ONLY valid JSON:

{
  "completedTodos": 0,
  "failedTodos": 0,
  "findings": [
    "finding 1",
    "finding 2"
  ],
  "structuredData": {}
}

Do not write a user-facing response.
Do not output markdown.
Output JSON only.
`,
  outputKey: 'execution_results',
});