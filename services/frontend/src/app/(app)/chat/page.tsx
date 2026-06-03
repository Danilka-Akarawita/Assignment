'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import * as gatewayApi from '@/lib/api/gateway';
import { useAuthStore } from '@/lib/auth/store';

export default function ChatIndexPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) return;
    void (async () => {
      const { conversations } = await gatewayApi.listConversations(accessToken);
      if (conversations.length > 0) {
        router.replace(`/chat/${conversations[0].id}`);
      } else {
        const { conversation } = await gatewayApi.createConversation(accessToken);
        router.replace(`/chat/${conversation.id}`);
      }
    })();
  }, [accessToken, router]);

  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="text-muted-foreground size-8 animate-spin" />
    </div>
  );
}
