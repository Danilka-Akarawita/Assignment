import { z } from 'zod';

export const submitFeedbackSchema = z.object({
  conversationId: z.number().int().positive(),
  assistantMessageId: z.number().int().positive(),
  rating: z.enum(['up', 'down']),
});

export const listFeedbackSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
