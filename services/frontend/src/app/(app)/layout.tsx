import { AppGuard } from '@/components/providers/app-guard';
import { AppSidebar } from '@/components/layout/app-sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppGuard>
      <div className="flex h-screen min-h-0 overflow-hidden bg-transparent">
        <AppSidebar />
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </AppGuard>
  );
}
