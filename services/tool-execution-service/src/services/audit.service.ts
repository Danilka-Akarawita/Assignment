import { prisma } from '../lib/prisma.js';
import type { ToolName } from '../types/tools.js';

export class AuditService {
  async record(params: {
    userId: number;
    toolName: ToolName;
    input: unknown;
    output?: unknown;
    success: boolean;
    error?: string;
    durationMs: number;
  }): Promise<void> {
    try {
      await prisma.toolExecution.create({
        data: {
          userId: params.userId,
          toolName: params.toolName,
          input: params.input as object,
          success: params.success,
          durationMs: params.durationMs,
          ...(params.output !== undefined ? { output: params.output as object } : {}),
          ...(params.error !== undefined ? { error: params.error } : {}),
        },
      });
    } catch {
      // Audit failures must not break tool execution
    }
  }
}
