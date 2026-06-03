export type ToolName = 'sql' | 'calculator' | 'knowledge_retrieval';

export interface ToolContext {
  userId: number;
  authToken: string;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ToolDefinition {
  name: ToolName;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface SqlQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

export interface SchemaColumn {
  name: string;
  dataType: string;
  udtName: string;
  isNullable: boolean;
}

export interface SchemaTable {
  schema: string;
  name: string;
  columns: SchemaColumn[];
}

export interface DatabaseSchemaCatalog {
  tables: SchemaTable[];
  pgvector: {
    note: string;
    operators: Array<{ operator: string; description: string }>;
    exampleSimilarityQuery: string;
  };
}
