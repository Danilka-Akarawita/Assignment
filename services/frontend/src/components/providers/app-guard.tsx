'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth/store';

export function AppGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    if (isHydrated && !accessToken) {
      router.replace('/login');
    }
  }, [isHydrated, accessToken, router]);

  if (!isHydrated || !accessToken) {
    return null;
  }

  return <>{children}</>;
}
