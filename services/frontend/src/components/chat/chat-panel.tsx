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
import { Loader2, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function ChatPanel({ conversationId }: { conversationId: number }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedbackMessageId, setFeedbackMessageId] = useState<number | null>(null);
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

  const handleFeedback = async (assistantMessageId: number, rating: 'up' | 'down') => {
    if (!accessToken) return;
    setFeedbackMessageId(assistantMessageId);
    try {
      const { feedback } = await gatewayApi.submitMessageFeedback(accessToken, {
        conversationId,
        assistantMessageId,
        rating,
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId ? { ...m, userFeedback: feedback.rating } : m
        )
      );
      toast.success('Thanks for your feedback');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save feedback');
    } finally {
      setFeedbackMessageId(null);
    }
  };

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
    <div className="grid h-full min-h-0 gap-5 lg:grid-cols-[1fr_340px]">
      <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-brand-200/70 bg-card shadow-card">
        <header className="flex items-center gap-3 border-b border-brand-200/60 bg-brand-50/50 px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-100">
            <Sparkles className="size-4 text-brand-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Conversation</h2>
            <p className="text-muted-foreground text-xs">
              Ask about your documents, policies, or data
            </p>
          </div>
        </header>

        <ScrollArea className="min-h-0 flex-1 px-5 py-5">
          {loading ? (
            <div className="text-muted-foreground flex h-40 items-center justify-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin text-brand-400" />
              Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-100">
                <Sparkles className="size-7 text-brand-400" />
              </div>
              <p className="text-sm font-medium text-foreground">Start the conversation</p>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                Ask about your documents, policies, or data. The agent will plan and use tools
                as needed.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
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
                    onFeedback={
                      m.role === 'ASSISTANT' && m.id > 0
                        ? (rating) => void handleFeedback(m.id, rating)
                        : undefined
                    }
                    feedbackSubmitting={feedbackMessageId === m.id}
                  />
                );
              })}
            </div>
          )}
          {error && (
            <p className="text-destructive mt-4 text-sm">{error}</p>
          )}
        </ScrollArea>

        <div className="border-t border-brand-200/60 bg-brand-50/30 p-4">
          <div className="flex gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              rows={2}
              className="min-h-[52px] resize-none border-brand-200/80 bg-white focus-visible:border-brand-300"
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
              className="size-11 shrink-0 self-end rounded-xl"
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
