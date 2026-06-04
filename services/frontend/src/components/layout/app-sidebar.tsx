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
  Bot,
  FileText,
  LogOut,
  MessageSquarePlus,
  MessagesSquare,
  Table2,
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
    <aside className="bg-sidebar text-sidebar-foreground flex w-72 shrink-0 flex-col border-r border-sidebar-border shadow-elevated">
      <div className="border-b border-sidebar-border px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-accent backdrop-blur-sm">
            <Bot className="size-5 text-sidebar-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-white">
              AI Assistant
            </h1>
            <p className="truncate text-xs text-white/70">{user?.email}</p>
          </div>
        </div>
      </div>
      <div className="px-4 py-4">
        <Button
          className="w-full justify-start gap-2 bg-sidebar-primary text-sidebar-primary-foreground shadow-sm hover:bg-brand-300"
          onClick={() => void newChat()}
        >
          <MessageSquarePlus className="size-4" />
          New chat
        </Button>
      </div>
      <Separator className="bg-sidebar-border" />
      <ScrollArea className="flex-1 px-3 py-3">
        <p className="mb-2 px-2 text-[0.65rem] font-semibold uppercase tracking-widest text-white/55">
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
                  'group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  active
                    ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                    : 'text-white/85 hover:bg-sidebar-accent/80 hover:text-white'
                )}
              >
                <MessagesSquare className="size-4 shrink-0 opacity-70" />
                <span className="min-w-0 flex-1 truncate">
                  {c.title ?? `Chat #${c.id}`}
                </span>
                <button
                  type="button"
                  className="rounded-md p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => void remove(c.id, e)}
                  aria-label="Delete conversation"
                >
                  <Trash2 className="size-3.5 text-white/60 hover:text-white" />
                </button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <Separator className="bg-sidebar-border" />
      <div className="space-y-0.5 p-3">
        <Link
          href="/documents"
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors',
            pathname === '/documents'
              ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
              : 'text-white/85 hover:bg-sidebar-accent/80 hover:text-white'
          )}
        >
          <FileText className="size-4" />
          Knowledge
        </Link>
        {user?.role === 'admin' && (
          <Link
            href="/admin/feedback"
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors',
              pathname === '/admin/feedback'
                ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                : 'text-white/85 hover:bg-sidebar-accent/80 hover:text-white'
            )}
          >
            <Table2 className="size-4" />
            Feedback
          </Link>
        )}
        <Button
          variant="ghost"
          className="mt-1 w-full justify-start gap-2.5 text-white/70 hover:bg-sidebar-accent/80 hover:text-white"
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
