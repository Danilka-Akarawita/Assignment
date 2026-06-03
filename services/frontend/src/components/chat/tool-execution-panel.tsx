'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { AgentRun, AgentTodo } from '@/lib/types';
import {
  Calculator,
  Database,
  FileSearch,
  ListTodo,
  Loader2,
  Wrench,
} from 'lucide-react';

function toolIcon(hint: string | null) {
  switch (hint) {
    case 'knowledge_retrieval':
      return FileSearch;
    case 'sql':
    case 'sql_query':
      return Database;
    case 'calculator':
      return Calculator;
    default:
      return hint ? Wrench : ListTodo;
  }
}

function statusVariant(
  status: AgentTodo['status']
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'COMPLETED':
      return 'default';
    case 'IN_PROGRESS':
      return 'secondary';
    case 'FAILED':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function ToolExecutionPanel({
  agentRun,
  isActive,
}: {
  agentRun: AgentRun | null;
  isActive?: boolean;
}) {
  const todos = agentRun?.todos ?? [];

  if (!agentRun && !isActive) {
    return (
      <Card className="h-full border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Tool execution</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Send a message to see the agent plan and tool steps here.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium">Tool execution</CardTitle>
          {agentRun && (
            <Badge variant={agentRun.status === 'FAILED' ? 'destructive' : 'secondary'}>
              {isActive && !['COMPLETED', 'FAILED'].includes(agentRun.status) && (
                <Loader2 className="mr-1 size-3 animate-spin" />
              )}
              {agentRun.status}
            </Badge>
          )}
        </div>
        {isActive && !agentRun && (
          <p className="text-muted-foreground text-xs">Starting agent run…</p>
        )}
      </CardHeader>
      <CardContent className="min-h-0 flex-1 pt-0">
        <ScrollArea className="h-[min(420px,50vh)] pr-3">
          <ul className="space-y-3">
            {todos.length === 0 && isActive && (
              <li className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Planning…
              </li>
            )}
            {todos.map((todo) => {
              const Icon = toolIcon(todo.toolHint);
              const result =
                todo.result && typeof todo.result === 'object' && todo.result !== null
                  ? (todo.result as { summary?: string }).summary
                  : typeof todo.result === 'string'
                    ? todo.result
                    : null;

              return (
                <li
                  key={todo.id}
                  className={cn(
                    'rounded-lg border p-3 text-sm',
                    todo.status === 'IN_PROGRESS' && 'border-primary/50 bg-muted/40'
                  )}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 font-medium">
                      <Icon className="text-muted-foreground size-4 shrink-0" />
                      <span>
                        {todo.position}. {todo.title}
                      </span>
                    </div>
                    <Badge variant={statusVariant(todo.status)} className="shrink-0 text-xs">
                      {todo.status}
                    </Badge>
                  </div>
                  {todo.toolHint && (
                    <p className="text-muted-foreground mb-1 font-mono text-xs">
                      {todo.toolHint}
                    </p>
                  )}
                  {todo.description && (
                    <p className="text-muted-foreground text-xs">{todo.description}</p>
                  )}
                  {result && (
                    <p className="mt-2 rounded bg-muted/60 p-2 text-xs">{result}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
