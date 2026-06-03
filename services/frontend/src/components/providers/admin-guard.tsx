'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth/store';
import { Loader2 } from 'lucide-react';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!isHydrated || !accessToken) return;
    if (user?.role !== 'admin') {
      router.replace('/chat');
    }
  }, [isHydrated, accessToken, user?.role, router]);

  if (!isHydrated || !accessToken || user?.role !== 'admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
