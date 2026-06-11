export type AgentRunWsEventType =
  | 'run.snapshot'
  | 'run.updated'
  | 'run.completed'
  | 'run.failed';

export interface AgentRunWsEvent {
  type: AgentRunWsEventType;
  agentRun: unknown;
}

type Listener = (event: AgentRunWsEvent) => void;

class AgentRunHub {
  private listeners = new Map<number, Set<Listener>>();

  subscribe(runId: number, listener: Listener): () => void {
    let set = this.listeners.get(runId);
    if (!set) {
      set = new Set();
      this.listeners.set(runId, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
      if (set && set.size === 0) {
        this.listeners.delete(runId);
      }
    };
  }

  publish(runId: number, event: AgentRunWsEvent): void {
    this.listeners.get(runId)?.forEach((listener) => listener(event));
  }
}

export const agentRunHub = new AgentRunHub();
