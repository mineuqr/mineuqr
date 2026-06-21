/**
 * THERMAL-PRINTING-6B — maps agentId to active WebSocket connections (transport only).
 */
export interface AgentWebSocketConnection {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  readonly readyState: AgentWebSocketReadyState;
}

export enum AgentWebSocketReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

export class AgentConnectionManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentConnectionManagerError";
  }
}

export interface RegisteredAgentConnection {
  agentId: string;
  connection: AgentWebSocketConnection;
  connectedAt: string;
}

const connections = new Map<string, RegisteredAgentConnection>();

function normalizeAgentId(agentId: string): string {
  const normalized = agentId.trim();
  if (!normalized) {
    throw new AgentConnectionManagerError("Agent id is required");
  }
  return normalized;
}

export function registerConnection(
  agentId: string,
  connection: AgentWebSocketConnection,
  connectedAt: string = new Date().toISOString()
): RegisteredAgentConnection {
  const normalizedAgentId = normalizeAgentId(agentId);
  const registered: RegisteredAgentConnection = {
    agentId: normalizedAgentId,
    connection,
    connectedAt,
  };

  connections.set(normalizedAgentId, registered);
  return registered;
}

export function unregisterConnection(agentId: string): boolean {
  return connections.delete(normalizeAgentId(agentId));
}

export function getConnection(agentId: string): RegisteredAgentConnection | undefined {
  return connections.get(normalizeAgentId(agentId));
}

export function listConnections(): RegisteredAgentConnection[] {
  return Array.from(connections.values()).sort((left, right) =>
    left.agentId.localeCompare(right.agentId)
  );
}

export function findAgentIdByConnection(
  connection: AgentWebSocketConnection
): string | undefined {
  let matchedAgentId: string | undefined;

  connections.forEach((entry) => {
    if (!matchedAgentId && entry.connection === connection) {
      matchedAgentId = entry.agentId;
    }
  });

  return matchedAgentId;
}

export function clearAgentConnections(): void {
  connections.clear();
}
