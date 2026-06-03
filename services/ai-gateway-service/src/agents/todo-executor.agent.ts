import { LlmAgent } from '@google/adk';
import { GEMINI_MODEL } from './config.js';
import { AGENT_TOOLS } from './tools/remote-tools.js';

export const todoExecutorAgent = new LlmAgent({
  name: 'TodoExecutorAgent',
  model: GEMINI_MODEL,
  description: 'Executes each todo from the plan using remote tools.',
  instruction: `You execute the plan stored in session state as agent_plan.

Plan JSON:
{agent_plan}

User id for SQL filters: {user_id}

Instructions:
1. Parse the plan todos in order.
2. For each todo, call update_todo_status(position, "in_progress") before starting.
3. Use the appropriate tool (knowledge_retrieval, sql_query, calculator) based on toolHint and description.
4. After each todo, call update_todo_status(position, "completed", resultSummary) or "failed" with reason.
5. Pass structured findings forward; later steps may use earlier results.
6. For invoice/expense tasks: retrieve relevant chunks first, extract line items and dates, then aggregate with calculator or SQL.
7. When all todos are done, output a JSON summary of execution:
{
  "completedTodos": number,
  "findings": ["bullet findings"],
  "structuredData": { "optional key figures" }
}

Do not write the final user-facing answer; only execute and summarize results.`,
  tools: AGENT_TOOLS,
  outputKey: 'execution_results',
});
