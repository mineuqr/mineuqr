/**
 * THERMAL-PRINTING-6D — reference agent runtime state.
 */

export type AgentState =
  | "starting"
  | "connecting"
  | "registering"
  | "ready"
  | "reconnecting"
  | "offline"
  | "stopping";

const ALLOWED_TRANSITIONS: Record<AgentState, readonly AgentState[]> = {
  starting: ["connecting", "stopping", "offline"],
  connecting: ["registering", "reconnecting", "offline", "stopping"],
  registering: ["ready", "reconnecting", "offline", "stopping"],
  ready: ["reconnecting", "stopping", "offline"],
  reconnecting: ["connecting", "offline", "stopping"],
  offline: ["connecting", "stopping"],
  stopping: ["offline"],
};

export class AgentLifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentLifecycleError";
  }
}

export function canTransition(from: AgentState, to: AgentState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: AgentState, to: AgentState): void {
  if (!canTransition(from, to)) {
    throw new AgentLifecycleError(`Invalid agent state transition: ${from} -> ${to}`);
  }
}
