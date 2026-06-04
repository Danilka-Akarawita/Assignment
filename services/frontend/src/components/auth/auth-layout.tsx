import type { ReactNode } from 'react';
import { Bot } from 'lucide-react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-brand-400 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #39ace7 0%, transparent 45%), radial-gradient(circle at 80% 80%, #9bd4e4 0%, transparent 40%)',
          }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <Bot className="size-6 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-white">
            AI Assistant
          </span>
        </div>
        <div className="relative z-10 max-w-md space-y-4">
          <h2 className="text-3xl font-semibold leading-tight text-white">
            Your knowledge base, powered by intelligent agents
          </h2>
          <p className="text-base leading-relaxed text-white/85">
            Upload documents, ask questions, and watch the agent plan and execute
            tools in real time.
          </p>
        </div>
        <p className="relative z-10 text-sm text-white/60">
          Secure workspace for your team
        </p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-10">
        {children}
      </section>
    </main>
  );
}
