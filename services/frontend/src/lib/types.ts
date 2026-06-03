export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: number;
  email: string;
  role: string;
}

export interface Conversation {
  id: number;
  userId: number;
  title: string | null;
  historySummary?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
}

export interface Message {
  id: number;
  conversationId: number;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  metadata?: unknown;
  agentRunId?: number | null;
  createdAt: string;
  userFeedback?: 'UP' | 'DOWN' | null;
}

export interface MessageFeedbackRecord {
  id: number;
  userId: number;
  conversationId: number;
  userMessageId: number;
  assistantMessageId: number;
  userQuery: string;
  assistantAnswer: string;
  rating: 'UP' | 'DOWN';
  createdAt: string;
  updatedAt: string;
}

export interface AgentTodo {
  id: number;
  agentRunId: number;
  position: number;
  title: string;
  description: string | null;
  toolHint: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  result?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRun {
  id: number;
  conversationId: number;
  userId: number;
  userQuery: string;
  status: 'PENDING' | 'PLANNING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
  plan?: unknown;
  errorMessage?: string | null;
  todos?: AgentTodo[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
  agentRuns?: AgentRun[];
}

export interface KnowledgeDocument {
  id: number;
  userId: number;
  filename: string;
  fileSizeBytes: number | null;
  mimeType: string | null;
  title: string | null;
  summary: string | null;
  tags: string[];
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorMessage: string | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageResult {
  conversationId: number;
  userMessageId: number;
  agentRunId: number;
  status: 'completed' | 'queued';
  assistantMessage?: { id: number; content: string };
  agentRun?: AgentRun;
  message?: string;
}
