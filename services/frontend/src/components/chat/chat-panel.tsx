'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageBubble } from '@/components/chat/message-bubble';
import { ToolExecutionPanel } from '@/components/chat/tool-execution-panel';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import * as gatewayApi from '@/lib/api/gateway';
import { useStreamingChat } from '@/lib/hooks/use-streaming-chat';
import { useAuthStore } from '@/lib/auth/store';
import type { Message } from '@/lib/types';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

export function ChatPanel({ conversationId }: { conversationId: number }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const {
    isSending,
    agentRun,
    streamingContent,
    streamEnabled,
    error,
    sendMessage,
    clearStream,
  } = useStreamingChat(accessToken);

  const loadMessages = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const { conversation } = await gatewayApi.getConversation(
        accessToken,
        conversationId
      );
      setMessages(conversation.messages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  }, [accessToken, conversationId]);

  useEffect(() => {
    loadMessages();
    clearStream();
  }, [loadMessages, clearStream]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    const optimistic: Message = {
      id: -Date.now(),
      conversationId,
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setInput('');

    try {
      await sendMessage(conversationId, text, setMessages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send');
    }
  };

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex min-h-0 flex-col rounded-xl border bg-card">
        <ScrollArea className="min-h-0 flex-1 p-4">
          {loading ? (
            <div className="text-muted-foreground flex h-40 items-center justify-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              Ask about your documents, policies, or data.
            </p>
          ) : (
            <div className="space-y-4">
              {messages.map((m, idx) => {
                const isStreamingAssistant =
                  streamEnabled &&
                  m.role === 'ASSISTANT' &&
                  idx === messages.length - 1;
                return (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    streamContent={
                      isStreamingAssistant ? streamingContent : undefined
                    }
                    streamEnabled={isStreamingAssistant}
                  />
                );
              })}
            </div>
          )}
          {error && (
            <p className="text-destructive mt-4 text-sm">{error}</p>
          )}
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              rows={2}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              disabled={isSending}
            />
            <Button
              size="icon"
              className="shrink-0 self-end"
              onClick={() => void handleSend()}
              disabled={isSending || !input.trim()}
            >
              {isSending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <ToolExecutionPanel agentRun={agentRun} isActive={isSending} />
    </div>
  );
}
