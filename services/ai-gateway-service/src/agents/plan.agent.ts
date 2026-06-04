import { LlmAgent } from "@google/adk";
import { PLAN_AGENT_INSTRUCTION } from "../prompts/index.js";
import { GEMINI_MODEL } from "./config.js";
import { beforeAgentGuard } from "./callbacks/guardrails.js";

// LLMRegistry.register(OpenAILLM);

export const planAgent = new LlmAgent({
  name: "PlanAgent",
  model: GEMINI_MODEL,
  description:
    "Creates a multi-step plan and todo list for complex user requests.",
  beforeAgentCallback: beforeAgentGuard,
  instruction: PLAN_AGENT_INSTRUCTION,
  outputKey: "agent_plan",
});
