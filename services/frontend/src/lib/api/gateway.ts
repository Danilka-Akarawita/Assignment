import { config } from '@/lib/config';
import type {
  AgentRun,
  Conversation,
  ConversationDetail,
  SendMessageResult,
} from '@/lib/types';
import { apiFetch } from './http';

const base = config.gatewayApiUrl;

export async function listConversations(
  accessToken: string
): Promise<{ conversations: Conversation[]; total: number }> {
  return apiFetch(`${base}/conversations`, { accessToken });
}

export async function createConversation(
  accessToken: string,
  title?: string
): Promise<{ conversation: Conversation }> {
  return apiFetch(`${base}/conversations`, {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ title }),
  });
}

export async function getConversation(
  accessToken: string,
  id: number
): Promise<{ conversation: ConversationDetail }> {
  return apiFetch(`${base}/conversations/${id}`, { accessToken });
}

export async function deleteConversation(
  accessToken: string,
  id: number
): Promise<{ message: string }> {
  return apiFetch(`${base}/conversations/${id}`, {
    method: 'DELETE',
    accessToken,
  });
}

export async function sendMessage(
  accessToken: string,
  conversationId: number,
  content: string,
  async = true
): Promise<SendMessageResult> {
  return apiFetch(`${base}/conversations/${conversationId}/messages`, {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ content, async }),
  });
}

export async function getAgentRun(
  accessToken: string,
  runId: number
): Promise<{ agentRun: AgentRun }> {
  return apiFetch(`${base}/conversations/agent-runs/${runId}`, { accessToken });
}
