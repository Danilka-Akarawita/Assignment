import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import {
  buildSqlGeneratorSystemPrompt,
  buildSqlGeneratorUserPrompt,
} from '../prompts/sql-generator.js';
import { logger } from '../utils/logger.js';
import type { DatabaseSchemaCatalog } from '../types/tools.js';
import { validateReadOnlySql } from './sql-validator.js';

const sqlOutputSchema = z.object({
  query: z.string().min(1),
});

export class SqlGeneratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SqlGeneratorError';
  }
}

export class SqlGeneratorService {
  async generateQuery(
    question: string,
    userId: number,
    catalog: DatabaseSchemaCatalog,
  ): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new SqlGeneratorError('OPENAI_API_KEY is not configured');
    }

    const modelId = process.env.SQL_GENERATOR_MODEL?.trim() ?? 'gpt-5.4-nano-2026-03-17';
    const openai = createOpenAI({ apiKey });

    const system = buildSqlGeneratorSystemPrompt(catalog, userId);
    const prompt = buildSqlGeneratorUserPrompt(question);

    logger.debug(
      { userId, modelId, questionPreview: question.slice(0, 120) },
      'Generating SQL from natural language',
    );

    const { object } = await generateObject({
      model: openai(modelId),
      schema: sqlOutputSchema,
      system,
      prompt,
      temperature: 0,
    });

    return this.sanitizeGeneratedQuery(object.query, userId);
  }

  /**
   * Optional single retry when validation or execution fails.
   */
  async generateQueryWithRepair(
    question: string,
    userId: number,
    catalog: DatabaseSchemaCatalog,
    previousQuery: string,
    errorMessage: string,
  ): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new SqlGeneratorError('OPENAI_API_KEY is not configured');
    }

    const modelId = process.env.SQL_GENERATOR_MODEL?.trim() ?? 'gpt-5.4-nano-2026-03-17';
    const openai = createOpenAI({ apiKey });
    const system = buildSqlGeneratorSystemPrompt(catalog, userId);

    const { object } = await generateObject({
      model: openai(modelId),
      schema: sqlOutputSchema,
      system,
      prompt: `${buildSqlGeneratorUserPrompt(question)}

The previous query failed. Fix it and return only a valid read-only PostgreSQL query.

Previous query:
${previousQuery}

Error:
${errorMessage}`,
      temperature: 0,
    });

    return this.sanitizeGeneratedQuery(object.query, userId);
  }

  /** Block DELETE/UPDATE/DDL etc. before SQL is returned or executed. */
  private sanitizeGeneratedQuery(raw: string, userId: number): string {
    const query = raw.trim();
    if (!query) {
      throw new SqlGeneratorError('Model did not return a SQL query');
    }

    try {
      return validateReadOnlySql(query, userId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Generated SQL failed validation';
      throw new SqlGeneratorError(message);
    }
  }
}
