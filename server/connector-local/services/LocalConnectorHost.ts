import type {
  LocalConnectorHealthSnapshot,
  LocalConnectorLifecycle,
  LocalConnectorRuntimeIdentity,
  LocalConnectorSessionState,
} from "../contracts/localContracts";
import type { LocalConnectorConfig } from "../contracts/LocalConnectorConfig";

/**
 * Authoritative Restaurant Local Connector lifecycle state.
 */
export class LocalConnectorHost {
  private lifecycle: LocalConnectorLifecycle = "stopped";
  private identity: LocalConnectorRuntimeIdentity | null = null;
  private config: LocalConnectorConfig | null = null;
  private session: LocalConnectorSessionState = {
    sessionId: null,
    connectionId: null,
    lastHeartbeatAt: null,
    lastAuthAt: null,
    registeredAt: null,
  };
  private gatewayConnected = false;
  private startedAt: number | null = null;

  beginStart(config: LocalConnectorConfig, identity: LocalConnectorRuntimeIdentity): void {
    this.config = config;
    this.identity = identity;
    this.lifecycle = "starting";
    this.startedAt = Date.now();
  }

  setLifecycle(lifecycle: LocalConnectorLifecycle): void {
    this.lifecycle = lifecycle;
  }

  getLifecycle(): LocalConnectorLifecycle {
    return this.lifecycle;
  }

  getIdentity(): LocalConnectorRuntimeIdentity | null {
    return this.identity;
  }

  getConfig(): LocalConnectorConfig | null {
    return this.config;
  }

  getSession(): LocalConnectorSessionState {
    return { ...this.session };
  }

  setGatewayConnected(connected: boolean, connectionId: string | null): void {
    this.gatewayConnected = connected;
    this.session = { ...this.session, connectionId };
  }

  setSessionId(sessionId: string | null): void {
    this.session = { ...this.session, sessionId };
  }

  markAuthenticated(at: string): void {
    this.session = { ...this.session, lastAuthAt: at };
    this.lifecycle = "authenticating";
  }

  markRegistered(at: string): void {
    this.session = { ...this.session, registeredAt: at };
    this.lifecycle = "registered";
  }

  markHeartbeat(at: string, lifecycle: LocalConnectorLifecycle): void {
    this.session = { ...this.session, lastHeartbeatAt: at };
    this.lifecycle = lifecycle;
  }

  beginStop(): void {
    this.lifecycle = "stopping";
  }

  markStopped(): void {
    this.lifecycle = "stopped";
    this.gatewayConnected = false;
    this.session = {
      sessionId: null,
      connectionId: null,
      lastHeartbeatAt: null,
      lastAuthAt: null,
      registeredAt: null,
    };
  }

  evaluateHealth(now: number = Date.now()): LocalConnectorHealthSnapshot {
    const identity = this.identity;
    const uptimeMs = this.startedAt == null ? 0 : now - this.startedAt;

    let connectorStatus: LocalConnectorHealthSnapshot["connectorStatus"] = "offline";
    if (this.lifecycle === "connecting" || this.lifecycle === "authenticating") {
      connectorStatus = "connecting";
    } else if (this.lifecycle === "degraded") {
      connectorStatus = "degraded";
    } else if (
      this.lifecycle === "healthy" ||
      this.lifecycle === "registered"
    ) {
      connectorStatus = "online";
    }

    return {
      lifecycle: this.lifecycle,
      connectorStatus,
      gatewayConnectivity: this.gatewayConnected ? "connected" : "disconnected",
      sessionState: this.getSession(),
      platformAvailable: true,
      uptimeMs,
      version: identity?.connectorVersion ?? "unknown",
      capabilities: identity?.capabilities ?? {
        supportsLocalDiscovery: false,
        supportsRemoteExecution: true,
        supportsBackgroundExecution: false,
        supportsInProcessExecution: false,
      },
      evaluatedAt: new Date(now).toISOString(),
    };
  }
}
