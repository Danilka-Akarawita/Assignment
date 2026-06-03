import { z } from 'zod';

export const createConversationSchema = z.object({
  title: z.string().min(1).max(500).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(16000),
  async: z.boolean().optional().default(false),
});

export const updateConversationSchema = z.object({
  title: z.string().min(1).max(500),
});
