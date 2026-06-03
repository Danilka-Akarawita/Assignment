'use client';

import { MarkdownContent } from '@/components/markdown/markdown-content';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';
import { useStreamingText } from '@/lib/hooks/use-streaming-text';

export function MessageBubble({
  message,
  streamContent,
  streamEnabled,
}: {
  message: Message;
  streamContent?: string;
  streamEnabled?: boolean;
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
      className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted border'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        ) : (
          <>
            <MarkdownContent content={displayed || '…'} />
            {isStreaming && (
              <span className="bg-foreground/70 ml-0.5 inline-block h-4 w-1.5 animate-pulse" />
            )}
          </>
        )}
      </div>
    </div>
  );
}
