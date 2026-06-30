import type {
  ConnectorAuthResult,
  ConnectorHeartbeatResult,
  ConnectorRegisterResult,
} from "../../connector-session/contracts/sessionContracts";
import type { TransportOutboundMessage } from "../../connector-session/contracts/ConnectorTransportPort";
import type { ConnectorCommandHandler } from "../contracts/ConnectorCommandHandler";
import type { ConnectorPeerTransport } from "../contracts/GatewayTransportPort";
import type { LocalConnectorConfig } from "../contracts/LocalConnectorConfig";
import type { LocalConnectorRuntimeIdentity } from "../contracts/localContracts";
import { buildRuntimeCapabilities } from "./RuntimeIdentityBuilder";

export type SessionClientState = {
  sessionId: string | null;
  transport: ConnectorPeerTransport | null;
};

/**
 * RLC session client — auth, register, heartbeat, command loop (ADR-ARCH-016 outbound).
 */
export class ConnectorSessionClient {
  private transport: ConnectorPeerTransport | null = null;
  private sessionId: string | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly config: LocalConnectorConfig,
    private readonly identity: LocalConnectorRuntimeIdentity,
    private readonly commandHandler: ConnectorCommandHandler
  ) {}

  getState(): SessionClientState {
    return { sessionId: this.sessionId, transport: this.transport };
  }

  async connect(transport: ConnectorPeerTransport): Promise<void> {
    this.transport = transport;
    this.attachCommandLoop(transport);
    transport.onDisconnect(() => {
      this.stopHeartbeat();
      this.running = false;
    });
  }

  async authenticate(): Promise<ConnectorAuthResult> {
    const transport = this.requireTransport();
    return sendAndWait<ConnectorAuthResult>(transport, "auth_result", async () => {
      await transport.sendInbound({
        type: "auth",
        payload: {
          restaurantId: this.config.restaurantId,
          connectorId: this.config.connectorId,
          runtimeId: this.config.runtimeId,
          credentialSecret: this.config.credentialSecret,
          version: this.config.connectorVersion,
          platform: this.config.platform,
        },
      });
    });
  }

  async register(sessionId: string): Promise<ConnectorRegisterResult> {
    const transport = this.requireTransport();
    this.sessionId = sessionId;
    return sendAndWait<ConnectorRegisterResult>(transport, "register_result", async () => {
      await transport.sendInbound({
        type: "register",
        payload: {
          sessionId,
          restaurantId: this.config.restaurantId,
          connectorId: this.config.connectorId,
          runtimeId: this.config.runtimeId,
          platform: this.config.platform,
          version: this.config.connectorVersion,
          deploymentType: this.config.deploymentType,
          capabilities: buildRuntimeCapabilities(),
          hostFingerprint: this.config.hostFingerprint,
          hostLabel: this.config.hostLabel,
        },
      });
    });
  }

  async sendHeartbeat(): Promise<ConnectorHeartbeatResult> {
    const transport = this.requireTransport();
    if (!this.sessionId) {
      throw new Error("session_not_established");
    }

    return sendAndWait<ConnectorHeartbeatResult>(transport, "heartbeat_result", async () => {
      await transport.sendInbound({
        type: "heartbeat",
        payload: {
          sessionId: this.sessionId!,
          restaurantId: this.config.restaurantId,
          connectorId: this.config.connectorId,
          version: this.config.connectorVersion,
          capabilities: buildRuntimeCapabilities(),
          receivedAt: new Date().toISOString(),
        },
      });
    });
  }

  startHeartbeat(onResult?: (result: ConnectorHeartbeatResult) => void): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      void this.sendHeartbeat()
        .then((result) => onResult?.(result))
        .catch(() => onResult?.({
          success: false,
          lifecycle: "degraded",
          failureCode: "heartbeat_timeout",
          message: "Heartbeat failed",
        }));
    }, this.config.heartbeatIntervalMs);
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    this.running = false;
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    this.sessionId = null;
  }

  isRunning(): boolean {
    return this.running;
  }

  markRunning(): void {
    this.running = true;
  }

  private requireTransport(): ConnectorPeerTransport {
    if (!this.transport) {
      throw new Error("transport_not_connected");
    }
    return this.transport;
  }

  private attachCommandLoop(transport: ConnectorPeerTransport): void {
    transport.onOutbound((message) => {
      if (message.type !== "command") return;
      void this.handleCommand(message.payload);
    });
  }

  private async handleCommand(command: import("../../connector-session/contracts/sessionContracts").ConnectorCommandEnvelope): Promise<void> {
    const transport = this.transport;
    if (!transport) return;

    const response = await this.commandHandler.handle(command);
    await transport.sendInbound({ type: "response", payload: response });
  }
}

async function sendAndWait<T>(
  transport: ConnectorPeerTransport,
  expectedType: TransportOutboundMessage["type"],
  send: () => Promise<void>
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("session_response_timeout")), 10_000);
    transport.onOutbound((message) => {
      if (message.type !== expectedType) return;
      clearTimeout(timeout);
      resolve(message.payload as T);
    });
    void send().catch((error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}
