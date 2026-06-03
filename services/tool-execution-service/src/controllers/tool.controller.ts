import type { Response } from 'express';
import { ZodError } from 'zod';
import type { AuthRequest } from '../middleware/auth.js';
import { executeToolSchema } from '../schemas/tool.schema.js';
import { SqlService } from '../services/sql.service.js';
import { ToolExecutorService } from '../services/tool-executor.service.js';
import { TOOL_DEFINITIONS } from '../tools/registry.js';
import { logger } from '../utils/logger.js';

const executor = new ToolExecutorService();
const sqlService = new SqlService();

export const listTools = (_req: AuthRequest, res: Response) => {
  res.json({ tools: TOOL_DEFINITIONS });
};

export const getSqlSchema = async (_req: AuthRequest, res: Response) => {
  try {
    const catalog = await sqlService.getSchemaCatalog();
    res.json(catalog);
  } catch (err) {
    logger.error({ err }, 'Failed to load SQL schema catalog');
    res.status(500).json({ error: 'Failed to load schema catalog' });
  }
};

export const executeTool = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.authToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = executeToolSchema.parse(req.body);
    const result = await executor.execute(
      { userId: req.user.id, authToken: req.authToken },
      parsed
    );

    if (!result.success) {
      return res.status(400).json({
        tool: parsed.tool,
        success: false,
        error: result.error,
      });
    }

    res.json({
      tool: parsed.tool,
      success: true,
      result: result.data,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: 'Invalid request',
        details: err.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      });
    }
    logger.error({ err }, 'Tool execution failed');
    res.status(500).json({ error: 'Internal server error' });
  }
};
