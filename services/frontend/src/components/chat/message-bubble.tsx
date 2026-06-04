'use client';

import { MessageFeedback } from '@/components/chat/message-feedback';
import { MarkdownContent } from '@/components/markdown/markdown-content';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';
import { useStreamingText } from '@/lib/hooks/use-streaming-text';
import { Bot, User } from 'lucide-react';

export function MessageBubble({
  message,
  streamContent,
  streamEnabled,
  onFeedback,
  feedbackSubmitting,
}: {
  message: Message;
  streamContent?: string;
  streamEnabled?: boolean;
  onFeedback?: (rating: 'up' | 'down') => void;
  feedbackSubmitting?: boolean;
}) {
  const isUser = message.role === 'USER';
  const fullText =
    streamContent !== undefined && !isUser ? streamContent : message.content;
  const { displayed, isStreaming } = useStreamingText(
    fullText,
    Boolean(streamEnabled && !isUser),
    6
  );

  return (
    <div
      className={cn('flex w-full gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg',
          isUser ? 'bg-brand-400 text-white' : 'bg-brand-100 text-brand-400'
        )}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>
      <div
        className={cn(
          'max-w-[min(85%,42rem)] rounded-2xl px-4 py-3 shadow-sm',
          isUser
            ? 'bg-brand-400 text-primary-foreground'
            : 'border border-brand-200/80 bg-white'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        ) : (
          <>
            <MarkdownContent content={displayed || '…'} />
            {isStreaming && (
              <span className="bg-brand-400/70 ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm" />
            )}
            {!isStreaming && message.id > 0 && onFeedback && (
              <MessageFeedback
                rating={message.userFeedback ?? null}
                disabled={feedbackSubmitting}
                onRate={onFeedback}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
