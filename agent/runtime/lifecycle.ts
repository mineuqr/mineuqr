/**
 * THERMAL-PRINTING-6D — central lifecycle controller with validated transitions.
 */
import { assertTransition, type AgentState } from "./state";

export type AgentLifecycleListener = (state: AgentState) => void;

export class AgentLifecycle {
  private state: AgentState = "starting";
  private readonly listeners = new Set<AgentLifecycleListener>();

  getState(): AgentState {
    return this.state;
  }

  onStateChange(listener: AgentLifecycleListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  transition(next: AgentState): AgentState {
    assertTransition(this.state, next);
    this.state = next;
    this.listeners.forEach((listener) => {
      listener(next);
    });
    return this.state;
  }

  resetForTest(initial: AgentState = "starting"): void {
    this.state = initial;
    this.listeners.clear();
  }
}
