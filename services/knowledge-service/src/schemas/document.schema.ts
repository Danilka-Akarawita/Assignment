import { z } from 'zod';

export const searchSchema = z.object({
  query: z.string().min(1).max(2000),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  documentId: z.coerce.number().int().positive().optional(),
  minSimilarity: z.coerce.number().min(0).max(1).optional().default(0.25),
  useMetadataExtraction: z.boolean().optional().default(true),
});

export const updateMetadataSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  tags: z.array(z.string().min(1).max(100)).max(20).optional(),
});

export type SearchInput = z.infer<typeof searchSchema>;
export type UpdateMetadataInput = z.infer<typeof updateMetadataSchema>;

export interface IngestionMessage {
  documentId: number;
  userId: number;
  filename: string;
  timestamp: string;
}
