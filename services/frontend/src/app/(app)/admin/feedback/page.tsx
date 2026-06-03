'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminGuard } from '@/components/providers/admin-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as gatewayApi from '@/lib/api/gateway';
import { useAuthStore } from '@/lib/auth/store';
import type { MessageFeedbackRecord } from '@/lib/types';
import { Loader2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 25;

export default function AdminFeedbackPage() {
  return (
    <AdminGuard>
      <AdminFeedbackContent />
    </AdminGuard>
  );
}

function AdminFeedbackContent() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [rows, setRows] = useState<MessageFeedbackRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await gatewayApi.listMessageFeedback(accessToken, {
        limit: PAGE_SIZE,
        offset,
      });
      setRows(res.feedback);
      setTotal(res.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [accessToken, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex h-full min-h-0 flex-col p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Message feedback</h1>
        <p className="text-muted-foreground text-sm">
          User ratings on AI answers ({total} total)
        </p>
      </div>

      <div className="min-h-0 flex-1 rounded-xl border bg-card">
        {loading ? (
          <div className="text-muted-foreground flex h-48 items-center justify-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground py-16 text-center text-sm">No feedback yet.</p>
        ) : (
          <ScrollArea className="h-full max-h-[calc(100vh-12rem)]">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0 border-b">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Rating</th>
                  <th className="px-4 py-3 font-medium">User query</th>
                  <th className="px-4 py-3 font-medium">AI answer</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b align-top hover:bg-muted/30">
                    <td className="text-muted-foreground whitespace-nowrap px-4 py-3">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">#{row.userId}</td>
                    <td className="px-4 py-3">
                      <RatingBadge rating={row.rating} />
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <p className="line-clamp-4 whitespace-pre-wrap">{row.userQuery}</p>
                    </td>
                    <td className="max-w-md px-4 py-3">
                      <p className="line-clamp-4 whitespace-pre-wrap">{row.assistantAnswer}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0 || loading}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PAGE_SIZE >= total || loading}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RatingBadge({ rating }: { rating: 'UP' | 'DOWN' }) {
  if (rating === 'UP') {
    return (
      <Badge variant="secondary" className="gap-1">
        <ThumbsUp className="size-3" />
        Up
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <ThumbsDown className="size-3" />
      Down
    </Badge>
  );
}
