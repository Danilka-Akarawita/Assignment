'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import * as gatewayApi from '@/lib/api/gateway';
import { useAuthStore } from '@/lib/auth/store';
import type { Conversation } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  FileText,
  LogOut,
  MessageSquarePlus,
  MessagesSquare,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { accessToken, user, logout } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const { conversations: list } = await gatewayApi.listConversations(accessToken);
      setConversations(list);
    } catch {
      /* ignore */
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  const newChat = async () => {
    if (!accessToken) return;
    try {
      const { conversation } = await gatewayApi.createConversation(accessToken);
      router.push(`/chat/${conversation.id}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create chat');
    }
  };

  const remove = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!accessToken) return;
    try {
      await gatewayApi.deleteConversation(accessToken, id);
      if (pathname === `/chat/${id}`) router.push('/chat');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex w-64 shrink-0 flex-col border-r">
      <div className="p-4">
        <h1 className="text-lg font-semibold tracking-tight">AI Assistant</h1>
        <p className="text-muted-foreground truncate text-xs">{user?.email}</p>
      </div>
      <div className="px-3 pb-2">
        <Button className="w-full justify-start gap-2" onClick={() => void newChat()}>
          <MessageSquarePlus className="size-4" />
          New chat
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-2 py-2">
        <p className="text-muted-foreground mb-2 px-2 text-xs font-medium uppercase">
          History
        </p>
        <nav className="space-y-0.5">
          {conversations.map((c) => {
            const href = `/chat/${c.id}`;
            const active = pathname === href;
            return (
              <Link
                key={c.id}
                href={href}
                className={cn(
                  'group flex items-center gap-2 rounded-md px-2 py-2 text-sm',
                  active ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent/60'
                )}
              >
                <MessagesSquare className="size-4 shrink-0 opacity-60" />
                <span className="min-w-0 flex-1 truncate">
                  {c.title ?? `Chat #${c.id}`}
                </span>
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={(e) => void remove(c.id, e)}
                  aria-label="Delete conversation"
                >
                  <Trash2 className="text-muted-foreground hover:text-destructive size-3.5" />
                </button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <Separator />
      <div className="space-y-1 p-3">
        <Link
          href="/documents"
          className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm"
        >
          <FileText className="size-4" />
          Knowledge
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => {
            logout();
            router.replace('/login');
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
