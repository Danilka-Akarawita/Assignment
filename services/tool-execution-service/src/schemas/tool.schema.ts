import { z } from 'zod';

export const calculatorInputSchema = z.object({
  expression: z.string().min(1).max(2000),
});

export const sqlInputSchema = z.object({
  query: z.string().min(1).max(10000),
});

export const knowledgeRetrievalInputSchema = z.object({
  query: z.string().min(1).max(2000),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  documentId: z.coerce.number().int().positive().optional(),
  minSimilarity: z.coerce.number().min(0).max(1).optional().default(0.5),
  filters: z
    .object({
      topics: z.array(z.string()).optional(),
      keywords: z.array(z.string()).optional(),
      contentType: z.string().optional(),
      section: z.string().optional(),
      entities: z.array(z.string()).optional(),
    })
    .optional(),
});

export const executeToolSchema = z.discriminatedUnion('tool', [
  z.object({
    tool: z.literal('calculator'),
    arguments: calculatorInputSchema,
  }),
  z.object({
    tool: z.literal('sql'),
    arguments: sqlInputSchema,
  }),
  z.object({
    tool: z.literal('knowledge_retrieval'),
    arguments: knowledgeRetrievalInputSchema,
  }),
]);

export type ExecuteToolInput = z.infer<typeof executeToolSchema>;
export type CalculatorInput = z.infer<typeof calculatorInputSchema>;
export type SqlInput = z.infer<typeof sqlInputSchema>;
export type KnowledgeRetrievalInput = z.infer<typeof knowledgeRetrievalInputSchema>;
