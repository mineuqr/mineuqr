import type { LiveConnectorSession } from "./sessionContracts";

export interface ConnectorSessionRepository {
  save(session: LiveConnectorSession): Promise<void>;
  findBySessionId(sessionId: string): Promise<LiveConnectorSession | null>;
  findByConnectorId(connectorId: string): Promise<LiveConnectorSession | null>;
  findByConnection(connectionId: string): Promise<LiveConnectorSession | null>;
  remove(sessionId: string): Promise<boolean>;
}
