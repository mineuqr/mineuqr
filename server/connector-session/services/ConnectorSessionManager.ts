import type {
  ConnectorSessionLifecycle,
  LiveConnectorSession,
} from "../contracts/sessionContracts";
import type { ConnectorSessionRepository } from "../contracts/ConnectorSessionRepository";
import type { ConnectorTransportRegistry } from "../contracts/ConnectorTransportPort";
import { generateSessionId } from "../infrastructure/connectorCrypto";

export type SessionTransitionResult = {
  session: LiveConnectorSession;
  replacedSessionId: string | null;
};

/**
 * Authoritative connector session lifecycle (ADR-ARCH-016).
 */
export class ConnectorSessionManager {
  constructor(
    private readonly sessionRepository: ConnectorSessionRepository,
    private readonly transportRegistry: ConnectorTransportRegistry
  ) {}

  async beginConnecting(connectionId: string): Promise<LiveConnectorSession> {
    const session: LiveConnectorSession = {
      sessionId: generateSessionId(),
      identity: {
        connectorId: "",
        restaurantId: 0,
        runtimeId: "",
        platform: "",
        version: "",
        deploymentType: "local_desktop",
        capabilities: {
          supportsLocalDiscovery: false,
          supportsRemoteExecution: true,
          supportsBackgroundExecution: false,
          supportsInProcessExecution: false,
        },
        hostFingerprint: null,
      },
      lifecycle: "connecting",
      auth: {
        credentialId: "",
        issuedAt: new Date().toISOString(),
        expiresAt: null,
        renewedAt: null,
      },
      transportConnectionId: connectionId,
      connectedAt: new Date().toISOString(),
      lastHeartbeatAt: null,
    };
    await this.sessionRepository.save(session);
    return session;
  }

  async transition(
    sessionId: string,
    lifecycle: ConnectorSessionLifecycle
  ): Promise<LiveConnectorSession | null> {
    const session = await this.sessionRepository.findBySessionId(sessionId);
    if (!session) return null;
    const updated = { ...session, lifecycle };
    await this.sessionRepository.save(updated);
    return updated;
  }

  async attachIdentity(
    sessionId: string,
    identity: LiveConnectorSession["identity"],
    auth: LiveConnectorSession["auth"]
  ): Promise<LiveConnectorSession | null> {
    const session = await this.sessionRepository.findBySessionId(sessionId);
    if (!session) return null;
    const updated = { ...session, identity, auth, lifecycle: "authenticating" as const };
    await this.sessionRepository.save(updated);
    return updated;
  }

  async registerSession(
    session: LiveConnectorSession,
    connectorInstanceId: string
  ): Promise<SessionTransitionResult> {
    const existing = await this.sessionRepository.findByConnectorId(connectorInstanceId);
    let replacedSessionId: string | null = null;

    if (existing && existing.sessionId !== session.sessionId) {
      replacedSessionId = existing.sessionId;
      await this.disconnect(existing.sessionId, "duplicate_session");
    }

    const registered: LiveConnectorSession = {
      ...session,
      lifecycle: "registered",
      lastHeartbeatAt: new Date().toISOString(),
    };
    await this.sessionRepository.save(registered);

    const connection = this.transportRegistry.getByConnection(session.transportConnectionId);
    if (connection) {
      this.transportRegistry.bind(connectorInstanceId, connection);
    }

    return { session: registered, replacedSessionId };
  }

  async markHealthy(sessionId: string, heartbeatAt: string): Promise<LiveConnectorSession | null> {
    const session = await this.sessionRepository.findBySessionId(sessionId);
    if (!session) return null;
    const updated: LiveConnectorSession = {
      ...session,
      lifecycle: "healthy",
      lastHeartbeatAt: heartbeatAt,
      auth: { ...session.auth, renewedAt: heartbeatAt },
    };
    await this.sessionRepository.save(updated);
    return updated;
  }

  async markDegraded(sessionId: string): Promise<LiveConnectorSession | null> {
    return this.transition(sessionId, "degraded");
  }

  async disconnect(sessionId: string, _reason?: string): Promise<boolean> {
    const session = await this.sessionRepository.findBySessionId(sessionId);
    if (!session) return false;
    const connection = this.transportRegistry.getByConnection(session.transportConnectionId);
    this.transportRegistry.unbind(session.transportConnectionId);
    if (connection) {
      await connection.close();
    }
    await this.sessionRepository.remove(sessionId);
    return true;
  }

  async getBySessionId(sessionId: string): Promise<LiveConnectorSession | null> {
    return this.sessionRepository.findBySessionId(sessionId);
  }

  async getByConnectorId(connectorId: string): Promise<LiveConnectorSession | null> {
    return this.sessionRepository.findByConnectorId(connectorId);
  }

  async getByConnection(connectionId: string): Promise<LiveConnectorSession | null> {
    return this.sessionRepository.findByConnection(connectionId);
  }
}
