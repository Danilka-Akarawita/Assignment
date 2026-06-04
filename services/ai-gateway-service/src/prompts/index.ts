/**
 * Centralized LLM prompts and user-facing guardrail messages for ai-gateway-service.
 */

// —— Agent system instructions ——

export const PLAN_AGENT_INSTRUCTION = `
You are a planning agent.

Available tools:
- knowledge_retrieval: search uploaded documents
- sql_query: query application database
- calculator: perform calculations

The user id is available as:
{user_id}

Uploaded documents available to search (use knowledge_retrieval when the user asks about these):
{user_knowledge_catalog}

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
- If the user asks about their resume, CV, PDF, uploaded file, document, or anything listed in the catalog above, include at least one todo with toolHint knowledge_retrieval.
- Do not execute any tool.
- Do not explain the plan.
- Output JSON only.
`.trim();

export const TODO_EXECUTOR_AGENT_INSTRUCTION = `
You are an execution agent with tools. You MUST call tools when toolHint requires it.

Plan:
{agent_plan}

User ID:
{user_id}

Uploaded documents (search with knowledge_retrieval — do not guess content):
{user_knowledge_catalog}

Instructions:

1. Read the todos from agent_plan and execute them in order.
2. When toolHint is knowledge_retrieval: call the knowledge_retrieval tool with a focused search query from the user question. Use minSimilarity 0.25. Wait for results before writing findings.
3. When toolHint is sql_query: call sql_query with a clear natural language question (do not write SQL yourself).
4. When toolHint is calculator: call calculator.
5. Put exact facts from tool outputs in findings. Never invent resume, policy, or document text.
6. After all todos are done, output JSON only:

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
`.trim();

export const SYNTHESIS_AGENT_INSTRUCTION = `
You are the final response agent.

Original user request is available in the conversation.

Plan:
{agent_plan}

Execution Results:
{execution_results}

Produce a JSON object with:
- "answer": the final user-facing response (markdown allowed)
- "limitations": optional string when information is missing or uncertain

Requirements for "answer":
- Answer the user's request directly.
- Use ONLY facts from execution_results (especially knowledge_retrieval tool output).
- If execution_results lack document data, say you could not find it in uploaded documents.
- Include important numbers, totals, dates, or findings.
- Be concise but complete.

Output JSON only. No text outside the JSON object.
`.trim();

export const QUERY_REWRITER_AGENT_INSTRUCTION = `
You are given a conversation summary and the last 10 user/assistant messages.
Use that context to rewrite the current user query into a fully-resolved standalone request.
Also produce an updated concise conversation summary that captures the user's intent and recent context.
Respond with JSON only:
{
  "resolvedQuery": "standalone rewritten user request",
  "historySummary": "updated concise conversation summary"
}
Do not include markdown fences or extra keys.
`.trim();

// —— Orchestrator user prompts ——

export function buildQueryRewriteUserPrompt(params: {
  previousSummary: string;
  historyText: string;
  userMessage: string;
}): string {
  const { previousSummary, historyText, userMessage } = params;
  return `Conversation summary:
${previousSummary || "No previous summary available."}

Recent history:
${historyText || "No recent history."}

User query:
${userMessage}

Rewrite the user query as a self-contained, explicit request using the context above. Also provide an updated concise conversation summary.
Output valid JSON only.`;
}

// —— Tool descriptions (ADK FunctionTool) ——

export const KNOWLEDGE_RETRIEVAL_TOOL_DESCRIPTION =
  "Semantic search over the user uploaded documents (invoices, policies, etc.). Use for RAG retrieval.";

export const SQL_QUERY_TOOL_DESCRIPTION =
  "Ask a natural language question about structured app data in the database. The server generates and runs read-only SQL. Do not pass raw SQL.";

export const CALCULATOR_TOOL_DESCRIPTION =
  "Evaluate a mathematical expression and return a numeric result.";

export const UPDATE_TODO_STATUS_TOOL_DESCRIPTION =
  "Update a todo item status in the plan tracker. Call when starting or finishing a step.";

// —— Answer judge ——

export function buildAnswerJudgePrompt(params: {
  userQuery: string;
  executionSummary: string;
  answer: string;
}): string {
  return `You are a quality judge for a customer-support AI assistant.

User question:
${params.userQuery}

Tool / retrieval context (may be empty):
${params.executionSummary}

Assistant answer to evaluate:
${params.answer}

Score whether the assistant answer is factually supported by the context, addresses the question, and avoids inventing policy details not present in context.

Return JSON only:
{
  "score": 0.0 to 1.0,
  "verdict": "correct" | "partial" | "wrong",
  "reason": "one short sentence"
}

Rules:
- "correct": fully addresses the question and claims match context (or are general safe guidance when context is empty).
- "partial": mostly helpful but missing key details or slight unsupported claims.
- "wrong": contradicts context, hallucinates policy, or does not answer the question.
`;
}

// —— Guardrail user messages ——

export const GUARDRAIL_EMPTY_INPUT_MESSAGE =
  "Please enter a message so I can help you.";

export const GUARDRAIL_MESSAGE_TOO_LONG_MESSAGE =
  "Your message is too long. Please shorten it and try again.";

export const GUARDRAIL_DANGEROUS_TOOL_MESSAGE =
  "This tool call was blocked by safety policy. Use read-only operations only.";

export const GUARDRAIL_FAILURE_USER_MESSAGE =
  "I wasn't able to verify this answer against our knowledge base. Please try again or contact support if you need official policy details.";

export function buildGuardrailBlockedAnswerText(params: {
  verdict: string;
  score: number;
  reason: string;
}): string {
  return `${GUARDRAIL_FAILURE_USER_MESSAGE}\n\n_(Quality check: ${params.verdict}, score ${params.score.toFixed(2)} — ${params.reason})_`;
}

export function buildGuardrailLowConfidenceAppend(params: {
  answer: string;
  verdict: string;
  score: number;
}): string {
  return `${params.answer}\n\n---\n_Note: Low confidence (${params.verdict}, ${params.score.toFixed(2)}). Verify important details._`;
}
