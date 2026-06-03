import type { ExecuteToolInput } from '../schemas/tool.schema.js';
import type { ToolContext, ToolResult } from '../types/tools.js';
import { AuditService } from './audit.service.js';
import { CalculatorError, CalculatorService } from './calculator.service.js';
import { KnowledgeRetrievalService } from './knowledge-retrieval.service.js';
import { SqlService } from './sql.service.js';
import { SqlValidationError } from './sql-validator.js';
import { KnowledgeClientError } from '../lib/knowledge-client.js';

export class ToolExecutorService {
  private calculator = new CalculatorService();
  private sql = new SqlService();
  private knowledge = new KnowledgeRetrievalService();
  private audit = new AuditService();

  async execute(
    ctx: ToolContext,
    input: ExecuteToolInput
  ): Promise<ToolResult> {
    const start = Date.now();
    let result: ToolResult;

    try {
      switch (input.tool) {
        case 'calculator':
          result = {
            success: true,
            data: this.calculator.evaluate(input.arguments.expression),
          };
          break;
        case 'sql':
          result = {
            success: true,
            data: await this.sql.execute(input.arguments.query, ctx.userId),
          };
          break;
        case 'knowledge_retrieval':
          result = {
            success: true,
            data: await this.knowledge.retrieve(ctx, input.arguments),
          };
          break;
      }
    } catch (err) {
      result = {
        success: false,
        error: this.formatError(err),
      };
    }

    const durationMs = Date.now() - start;
    const auditPayload: Parameters<AuditService['record']>[0] = {
      userId: ctx.userId,
      toolName: input.tool,
      input: input.arguments,
      success: result.success,
      durationMs,
    };
    if (result.success && result.data !== undefined) {
      auditPayload.output = result.data;
    }
    if (!result.success && result.error) {
      auditPayload.error = result.error;
    }
    await this.audit.record(auditPayload);

    if (!result.success) {
      return { success: false, error: result.error ?? 'Tool execution failed' };
    }
    return { success: true, data: result.data };
  }

  private formatError(err: unknown): string {
    if (err instanceof SqlValidationError) return err.message;
    if (err instanceof CalculatorError) return err.message;
    if (err instanceof KnowledgeClientError) return err.message;
    if (err instanceof Error) return err.message;
    return 'Tool execution failed';
  }
}
