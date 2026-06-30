import type { ConnectorGatewayService } from "../../connector-gateway/services/ConnectorGatewayService";
import type {
  ConnectorAuthRequest,
  ConnectorAuthResult,
  ConnectorRegisterRequest,
  ConnectorRegisterResult,
  ConnectorHeartbeatRequest,
  ConnectorHeartbeatResult,
} from "../contracts/sessionContracts";
import type {
  ConnectorTransportConnection,
  TransportInboundMessage,
} from "../contracts/ConnectorTransportPort";
import type { ConnectorAuthenticationService } from "./ConnectorAuthenticationService";
import type { ConnectorHeartbeatProtocol } from "./ConnectorHeartbeatProtocol";
import type { ConnectorRegistrationProtocol } from "./ConnectorRegistrationProtocol";
import type { ConnectorResponseRouter } from "./ConnectorResponseRouter";
import type { ConnectorSessionManager } from "./ConnectorSessionManager";

/**
 * Cloud-side transport handler — processes inbound RLC session messages.
 */
export class ConnectorSessionTransportHandler {
  constructor(
    private readonly authService: ConnectorAuthenticationService,
    private readonly sessionManager: ConnectorSessionManager,
    private readonly registrationProtocol: ConnectorRegistrationProtocol,
    private readonly heartbeatProtocol: ConnectorHeartbeatProtocol,
    private readonly responseRouter: ConnectorResponseRouter
  ) {}

  attach(connection: ConnectorTransportConnection): void {
    connection.onMessage((message) => {
      void this.handleMessage(connection, message);
    });

    connection.onDisconnect(() => {
      void this.handleDisconnect(connection.connectionId);
    });

    void this.sessionManager.beginConnecting(connection.connectionId);
  }

  private async handleMessage(
    connection: ConnectorTransportConnection,
    message: TransportInboundMessage
  ): Promise<void> {
    switch (message.type) {
      case "auth":
        await this.handleAuth(connection, message.payload);
        return;
      case "register":
        await this.handleRegister(connection, message.payload);
        return;
      case "heartbeat":
        await this.handleHeartbeat(connection, message.payload);
        return;
      case "response":
        this.responseRouter.route(message.payload);
        return;
      default:
        return;
    }
  }

  private async handleAuth(
    connection: ConnectorTransportConnection,
    request: ConnectorAuthRequest
  ): Promise<void> {
    const session = await this.sessionManager.getByConnection(connection.connectionId);
    if (!session) {
      await connection.send({
        type: "auth_result",
        payload: {
          success: false,
          sessionId: null,
          failureCode: "session_expired",
          message: "Session not found",
        },
      });
      return;
    }

    const validation = await this.authService.validateCredential({
      credentialId: `cred-${request.connectorId}`,
      credentialSecret: request.credentialSecret,
      restaurantId: request.restaurantId,
      connectorId: request.connectorId,
      version: request.version,
    });

    if (!validation.valid) {
      const result: ConnectorAuthResult = {
        success: false,
        sessionId: null,
        failureCode: validation.failureCode,
        message: validation.message,
      };
      await connection.send({ type: "auth_result", payload: result });
      await this.sessionManager.disconnect(session.sessionId);
      return;
    }

    const updated = await this.sessionManager.attachIdentity(
      session.sessionId,
      {
        connectorId: request.connectorId,
        restaurantId: request.restaurantId,
        runtimeId: request.runtimeId,
        platform: request.platform,
        version: request.version,
        deploymentType: "local_desktop",
        capabilities: {
          supportsLocalDiscovery: true,
          supportsRemoteExecution: true,
          supportsBackgroundExecution: true,
          supportsInProcessExecution: false,
        },
        hostFingerprint: null,
      },
      {
        credentialId: validation.credential.credentialId,
        issuedAt: validation.credential.issuedAt,
        expiresAt: validation.credential.expiresAt,
        renewedAt: null,
      }
    );

    await this.sessionManager.transition(session.sessionId, "authenticating");

    const result: ConnectorAuthResult = {
      success: true,
      sessionId: updated?.sessionId ?? session.sessionId,
      failureCode: null,
      message: null,
    };
    await connection.send({ type: "auth_result", payload: result });
  }

  private async handleRegister(
    connection: ConnectorTransportConnection,
    request: ConnectorRegisterRequest
  ): Promise<void> {
    const session = await this.sessionManager.getBySessionId(request.sessionId);
    const resolved = session ?? (await this.sessionManager.getByConnection(connection.connectionId));
    if (!resolved) {
      const result: ConnectorRegisterResult = {
        success: false,
        failureCode: "registration_failure",
        message: "Session not found",
      };
      await connection.send({ type: "register_result", payload: result });
      return;
    }

    const result = await this.registrationProtocol.register(request, resolved);
    await connection.send({ type: "register_result", payload: result });
  }

  private async handleHeartbeat(
    connection: ConnectorTransportConnection,
    request: ConnectorHeartbeatRequest
  ): Promise<void> {
    const result = await this.heartbeatProtocol.heartbeat(request);
    await connection.send({ type: "heartbeat_result", payload: result });
  }

  private async handleDisconnect(connectionId: string): Promise<void> {
    const session = await this.sessionManager.getByConnection(connectionId);
    if (!session) return;
    this.responseRouter.failAll("transport_unavailable", "Connector disconnected");
    await this.sessionManager.disconnect(session.sessionId);
  }
}
