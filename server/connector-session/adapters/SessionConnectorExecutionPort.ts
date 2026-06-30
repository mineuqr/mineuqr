import type {
  ConnectorExecutionPort,
  ConnectorExecutionResult,
} from "../../connector-gateway/contracts/ConnectorExecutionPort";
import type { GatewayPrintRouteRequest } from "../../connector-gateway/contracts/gatewayContracts";
import type { ConnectorCommandRouter } from "../services/ConnectorCommandRouter";
import type { ConnectorSessionManager } from "../services/ConnectorSessionManager";

/**
 * Gateway execution port — routes print commands over authenticated connector sessions.
 */
export class SessionConnectorExecutionPort implements ConnectorExecutionPort {
  constructor(
    private readonly sessionManager: ConnectorSessionManager,
    private readonly commandRouter: ConnectorCommandRouter
  ) {}

  async executePrint(
    connectorInstanceId: string,
    request: GatewayPrintRouteRequest
  ): Promise<ConnectorExecutionResult> {
    const session = await this.sessionManager.getByConnectorId(connectorInstanceId);
    if (!session) {
      return {
        success: false,
        failureReason: "connector_unavailable",
        message: "No active connector session",
      };
    }

    if (session.lifecycle === "disconnected" || session.lifecycle === "connecting") {
      return {
        success: false,
        failureReason: "transport_unavailable",
        message: "Connector session not established",
      };
    }

    const response = await this.commandRouter.routePrint(connectorInstanceId, session, request);

    if (!response.success) {
      return {
        success: false,
        failureReason: response.failureCode ?? "transport_unavailable",
        message: response.message ?? "Command failed",
      };
    }

    return { success: true };
  }
}
