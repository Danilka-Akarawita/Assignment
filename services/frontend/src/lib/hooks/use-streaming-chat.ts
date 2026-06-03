'use client';

import { useCallback, useRef, useState } from 'react';
import * as gatewayApi from '@/lib/api/gateway';
import type { AgentRun, AgentTodo, Message } from '@/lib/types';

const POLL_MS = 800;
const TERMINAL = new Set(['COMPLETED', 'FAILED']);

export interface ChatStreamState {
  isSending: boolean;
  agentRun: AgentRun | null;
  streamingContent: string;
  streamEnabled: boolean;
  error: string | null;
}

export function useStreamingChat(accessToken: string | null) {
  const [state, setState] = useState<ChatStreamState>({
    isSending: false,
    agentRun: null,
    streamingContent: '',
    streamEnabled: false,
    error: null,
  });
  const abortRef = useRef(false);

  const pollUntilDone = useCallback(
    async (runId: number): Promise<AgentRun> => {
      if (!accessToken) throw new Error('Not authenticated');

      while (!abortRef.current) {
        const { agentRun } = await gatewayApi.getAgentRun(accessToken, runId);
        setState((s) => ({ ...s, agentRun }));

        if (TERMINAL.has(agentRun.status)) return agentRun;
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      throw new Error('Cancelled');
    },
    [accessToken]
  );

  const sendMessage = useCallback(
    async (
      conversationId: number,
      content: string,
      onMessagesUpdate: (messages: Message[]) => void
    ) => {
      if (!accessToken) throw new Error('Not authenticated');

      abortRef.current = false;
      setState({
        isSending: true,
        agentRun: null,
        streamingContent: '',
        streamEnabled: false,
        error: null,
      });

      try {
        const result = await gatewayApi.sendMessage(
          accessToken,
          conversationId,
          content,
          true
        );

        let assistantContent = result.assistantMessage?.content ?? '';
        let finalRun = result.agentRun ?? null;

        if (result.status === 'queued' && result.agentRunId) {
          finalRun = await pollUntilDone(result.agentRunId);
        }

        const { conversation } = await gatewayApi.getConversation(
          accessToken,
          conversationId
        );
        onMessagesUpdate(conversation.messages);

        const lastAssistant = [...conversation.messages]
          .reverse()
          .find((m) => m.role === 'ASSISTANT');
        assistantContent = lastAssistant?.content ?? assistantContent;

        setState({
          isSending: false,
          agentRun: finalRun,
          streamingContent: assistantContent,
          streamEnabled: true,
          error:
            finalRun?.status === 'FAILED'
              ? finalRun.errorMessage ?? 'Agent run failed'
              : null,
        });

        return { assistantContent, agentRun: finalRun };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Send failed';
        setState((s) => ({
          ...s,
          isSending: false,
          error: message,
        }));
        throw err;
      }
    },
    [accessToken, pollUntilDone]
  );

  const cancel = useCallback(() => {
    abortRef.current = true;
    setState((s) => ({ ...s, isSending: false }));
  }, []);

  const clearStream = useCallback(() => {
    setState((s) => ({
      ...s,
      streamingContent: '',
      streamEnabled: false,
      agentRun: null,
    }));
  }, []);

  return { ...state, sendMessage, cancel, clearStream };
}

export type { AgentTodo };
