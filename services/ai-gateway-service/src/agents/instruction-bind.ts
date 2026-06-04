import type { ReadonlyContext } from '@google/adk';

const STATE_KEYS = [
  'user_id',
  'user_knowledge_catalog',
  'agent_plan',
  'execution_results',
] as const;

function readStateValue(state: ReadonlyContext['state'], key: string): string {
  const value = state.get(key);
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  const text = String(value).trim();
  return text;
}

/**
 * ADK replaces `{key}` in instructions from session state. Missing keys throw
 * "Context variable not found". Use a provider function instead of raw templates.
 */
export function bindInstruction(
  template: string,
  defaults: Partial<Record<(typeof STATE_KEYS)[number], string>> = {}
) {
  return (ctx: ReadonlyContext): string => {
    let result = template;
    for (const key of STATE_KEYS) {
      const pattern = new RegExp(`\\{${key}\\??\\}`, 'g');
      const value = readStateValue(ctx.state, key) || defaults[key] || '';
      result = result.replace(pattern, value);
    }
    return result;
  };
}
