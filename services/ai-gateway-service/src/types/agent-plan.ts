import { z } from 'zod';

export const agentPlanSchema = z.object({
  goal: z.string(),
  todos: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      toolHint: z.string().optional(),
    })
  ),
});

export type AgentPlan = z.infer<typeof agentPlanSchema>;

export function parseAgentPlan(raw: string): AgentPlan | null {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    const result = agentPlanSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
