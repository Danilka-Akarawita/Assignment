import { LlmAgent } from '@google/adk';
import { GEMINI_MODEL } from './config.js';
import { beforeAgentGuard } from './callbacks/guardrails.js';

// LLMRegistry.register(OpenAILLM);

export const planAgent = new LlmAgent({
  name: 'PlanAgent',
  model: GEMINI_MODEL,
  description: 'Creates a multi-step plan and todo list for complex user requests.',
  beforeAgentCallback: beforeAgentGuard,
  instruction: `
You are a planning agent.

Available tools:
- knowledge_retrieval: search uploaded documents
- sql_query: query application database
- calculator: perform calculations

The user id is available as:
{user_id}

Create an execution plan for the user's request.

Output ONLY valid JSON in this format:

{
  "goal": "one sentence goal",
  "todos": [
    {
      "position": 1,
      "title": "short title",
      "description": "detailed step description",
      "toolHint": "knowledge_retrieval"
    }
  ]
}

Rules:
- Create 1-7 ordered todos.
- Use toolHint values:
  - knowledge_retrieval
  - sql_query
  - calculator
  - none
- Do not execute any tool.
- Do not explain the plan.
- Output JSON only.
`,
  outputKey: 'agent_plan',
});