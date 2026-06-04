import { prisma } from "../lib/prisma.js";
import type { DatabaseSchemaCatalog, SqlQueryResult } from "../types/tools.js";
import { logger } from "../utils/logger.js";
import {
  ensureRowLimit,
  SqlValidationError,
  validateReadOnlySql,
} from "./sql-validator.js";
import {
  SqlGeneratorError,
  SqlGeneratorService,
} from "./sql-generator.service.js";

const STATEMENT_TIMEOUT_MS = parseInt(
  process.env.SQL_STATEMENT_TIMEOUT_MS ?? "5000",
  10,
);
const MAX_ROWS = parseInt(process.env.SQL_MAX_ROWS ?? "500", 10);
const ALLOWED_SCHEMAS = (process.env.SQL_ALLOWED_SCHEMAS ?? "public")
  .split(",")
  .map((schema: string) => schema.trim())
  .filter(Boolean);

const SQL_GENERATOR_MAX_RETRIES = parseInt(
  process.env.SQL_GENERATOR_MAX_RETRIES ?? "1",
  10,
);

export class SqlService {
  private generator = new SqlGeneratorService();

  /**
   * Natural language → OpenAI SQL generation → validate → execute.
   */
  async queryFromQuestion(
    question: string,
    userId: number,
  ): Promise<SqlQueryResult> {
    const catalog = await this.getSchemaCatalog();
    let generatedQuery = await this.generator.generateQuery(
      question,
      userId,
      catalog,
    );

    let lastError: Error | undefined;
    const attempts = Math.max(0, SQL_GENERATOR_MAX_RETRIES) + 1;

    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const result = await this.execute(generatedQuery, userId);
        return {
          ...result,
          question,
          generatedQuery,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const canRetry =
          attempt < attempts - 1 &&
          (err instanceof SqlValidationError ||
            err instanceof SqlGeneratorError ||
            err instanceof Error);

        if (!canRetry) break;

        generatedQuery = await this.generator.generateQueryWithRepair(
          question,
          userId,
          catalog,
          generatedQuery,
          lastError.message,
        );
      }
    }

    throw lastError ?? new SqlGeneratorError("SQL generation failed");
  }

  async execute(query: string, userId: number): Promise<SqlQueryResult> {
    let safeQuery: string;
    try {
      safeQuery = validateReadOnlySql(query, userId);
    } catch (err) {
      if (err instanceof SqlValidationError) throw err;
      throw err;
    }

    safeQuery = ensureRowLimit(safeQuery, MAX_ROWS);

    logger.debug(
      { userId, queryPreview: safeQuery.slice(0, 120) },
      "Executing read-only SQL",
    );

    await prisma.$executeRawUnsafe(
      `SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT_MS}ms'`,
    );

    const rows =
      await prisma.$queryRawUnsafe<Record<string, unknown>[]>(safeQuery);

    const limited = rows.slice(0, MAX_ROWS);
    const columns = limited.length > 0 ? Object.keys(limited[0] ?? {}) : [];

    return {
      columns,
      rows: limited.map((row: Record<string, unknown>) =>
        this.serializeRow(row),
      ),
      rowCount: limited.length,
      truncated: rows.length > MAX_ROWS,
    };
  }

  async getSchemaCatalog(): Promise<DatabaseSchemaCatalog> {
    const schemaList = ALLOWED_SCHEMAS.map(
      (schema: string) => `'${schema.replace(/'/g, "''")}'`,
    ).join(", ");

    const columns = await prisma.$queryRawUnsafe<
      Array<{
        table_schema: string;
        table_name: string;
        column_name: string;
        data_type: string;
        udt_name: string;
        is_nullable: string;
      }>
    >(
      `
      SELECT
        c.table_schema,
        c.table_name,
        c.column_name,
        c.data_type,
        c.udt_name,
        c.is_nullable
      FROM information_schema.columns c
      WHERE c.table_schema IN (${schemaList})
        AND c.table_name NOT LIKE 'pg_%'
        AND c.table_name NOT LIKE '_prisma%'
      ORDER BY c.table_schema, c.table_name, c.ordinal_position
      `,
    );

    const tableMap = new Map<string, DatabaseSchemaCatalog["tables"][number]>();

    for (const col of columns) {
      const key = `${col.table_schema}.${col.table_name}`;
      let table = tableMap.get(key);
      if (!table) {
        table = {
          schema: col.table_schema,
          name: col.table_name,
          columns: [],
        };
        tableMap.set(key, table);
      }
      table.columns.push({
        name: col.column_name,
        dataType: col.data_type,
        udtName: col.udt_name,
        isNullable: col.is_nullable === "YES",
      });
    }

    return {
      tables: [...tableMap.values()],
      pgvector: {
        note: "pgvector does not generate SQL from natural language. Use these operators in SELECT queries after obtaining an embedding from the knowledge service.",
        operators: [
          {
            operator: "<=>",
            description: "Cosine distance (lower is more similar)",
          },
          {
            operator: "<->",
            description: "L2 (Euclidean) distance",
          },
          {
            operator: "<#>",
            description: "Negative inner product",
          },
        ],
        exampleSimilarityQuery: `
SELECT
  c.id,
  c.chunk_text,
  1 - (c.embedding <=> '[0.1,0.2,...]'::vector) AS similarity
FROM knowledge_document_chunks c
INNER JOIN knowledge_documents d ON d.id = c.document_id
WHERE d.user_id = :userId
  AND d.status = 'COMPLETED'
  AND c.embedding IS NOT NULL
ORDER BY c.embedding <=> '[0.1,0.2,...]'::vector
LIMIT 10
        `.trim(),
      },
    };
  }

  private serializeRow(row: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === "bigint") {
        out[key] = value.toString();
      } else if (value instanceof Date) {
        out[key] = value.toISOString();
      } else {
        out[key] = value;
      }
    }
    return out;
  }
}
