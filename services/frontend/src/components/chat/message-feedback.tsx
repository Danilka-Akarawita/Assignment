'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

export function MessageFeedback({
  rating,
  disabled,
  onRate,
}: {
  rating?: 'UP' | 'DOWN' | null;
  disabled?: boolean;
  onRate: (rating: 'up' | 'down') => void;
}) {
  return (
    <div className="mt-2 flex items-center gap-1 border-t pt-2">
      <span className="text-muted-foreground mr-1 text-xs">Was this helpful?</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('size-8', rating === 'UP' && 'bg-primary/10 text-primary')}
        disabled={disabled}
        aria-label="Thumbs up"
        aria-pressed={rating === 'UP'}
        onClick={() => onRate('up')}
      >
        <ThumbsUp className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('size-8', rating === 'DOWN' && 'bg-destructive/10 text-destructive')}
        disabled={disabled}
        aria-label="Thumbs down"
        aria-pressed={rating === 'DOWN'}
        onClick={() => onRate('down')}
      >
        <ThumbsDown className="size-4" />
      </Button>
    </div>
  );
}
