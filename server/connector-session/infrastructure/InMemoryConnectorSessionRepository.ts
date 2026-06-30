import type { LiveConnectorSession } from "../contracts/sessionContracts";
import type { ConnectorSessionRepository } from "../contracts/ConnectorSessionRepository";

export class InMemoryConnectorSessionRepository implements ConnectorSessionRepository {
  private readonly bySessionId = new Map<string, LiveConnectorSession>();
  private readonly byConnectorId = new Map<string, LiveConnectorSession>();
  private readonly byConnection = new Map<string, LiveConnectorSession>();

  async save(session: LiveConnectorSession): Promise<void> {
    this.bySessionId.set(session.sessionId, session);
    this.byConnectorId.set(session.identity.connectorId, session);
    this.byConnection.set(session.transportConnectionId, session);
  }

  async findBySessionId(sessionId: string): Promise<LiveConnectorSession | null> {
    return this.bySessionId.get(sessionId) ?? null;
  }

  async findByConnectorId(connectorId: string): Promise<LiveConnectorSession | null> {
    return this.byConnectorId.get(connectorId) ?? null;
  }

  async findByConnection(connectionId: string): Promise<LiveConnectorSession | null> {
    return this.byConnection.get(connectionId) ?? null;
  }

  async remove(sessionId: string): Promise<boolean> {
    const session = this.bySessionId.get(sessionId);
    if (!session) return false;
    this.bySessionId.delete(sessionId);
    this.byConnectorId.delete(session.identity.connectorId);
    this.byConnection.delete(session.transportConnectionId);
    return true;
  }
}
