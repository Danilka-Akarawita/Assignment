export interface AgentPlanTodo {
  position: number;
  title: string;
  description?: string;
  toolHint?: string;
}

export interface AgentPlan {
  goal: string;
  todos: AgentPlanTodo[];
}

export interface ExecutionResults {
  completedTodos: number;
  failedTodos: number;
  findings: string[];
  structuredData?: Record<string, unknown>;
}

export interface QueryRewrite {
  resolvedQuery: string;
  historySummary: string;
}

export interface SynthesisOutput {
  answer: string;
  limitations?: string;
}

/** Parse JSON object from agent text (ADK usually returns clean JSON when outputSchema is set). */
export function parseAgentJson<T>(raw: string): T | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }
}

export function parseAgentPlan(raw: string): AgentPlan | null {
  const parsed = parseAgentJson<AgentPlan>(raw);
  if (!parsed?.goal || !Array.isArray(parsed.todos) || parsed.todos.length === 0) {
    return null;
  }
  return parsed;
}
