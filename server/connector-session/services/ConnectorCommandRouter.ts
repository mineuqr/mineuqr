import { randomBytes } from "node:crypto";
import type { GatewayPrintRouteRequest } from "../../connector-gateway/contracts/gatewayContracts";
import type {
  ConnectorCommandEnvelope,
  ConnectorCommandResponse,
  ExecutePrintCommandPayload,
  LiveConnectorSession,
} from "../contracts/sessionContracts";
import type {
  ConnectorTransportConnection,
  ConnectorTransportRegistry,
} from "../contracts/ConnectorTransportPort";
import type { ConnectorResponseRouter } from "./ConnectorResponseRouter";
import { generateNonce } from "../infrastructure/connectorCrypto";

const COMMAND_TIMEOUT_MS = 30_000;

/**
 * Routes gateway commands to authenticated connector sessions.
 */
export class ConnectorCommandRouter {
  constructor(
    private readonly transportRegistry: ConnectorTransportRegistry,
    private readonly responseRouter: ConnectorResponseRouter,
    private readonly commandTimeoutMs: number = COMMAND_TIMEOUT_MS
  ) {}

  async routePrint(
    connectorInstanceId: string,
    session: LiveConnectorSession,
    request: GatewayPrintRouteRequest
  ): Promise<ConnectorCommandResponse> {
    const connection = this.transportRegistry.getByInstance(connectorInstanceId);
    if (!connection) {
      return {
        commandId: "unrouted",
        success: false,
        failureCode: "transport_unavailable",
        message: "No active transport connection",
        payload: null,
      };
    }

    if (session.lifecycle === "disconnected" || session.lifecycle === "connecting") {
      return {
        commandId: "unrouted",
        success: false,
        failureCode: "connector_unavailable",
        message: "Connector session not ready",
        payload: null,
      };
    }

    const command = this.buildExecutePrintCommand(session, request);
    const responsePromise = this.responseRouter.awaitResponse(command.commandId, this.commandTimeoutMs);

    await connection.send({ type: "command", payload: command });

    try {
      return await responsePromise;
    } catch {
      return {
        commandId: command.commandId,
        success: false,
        failureCode: "transport_unavailable",
        message: "Command response timeout",
        payload: null,
      };
    }
  }

  async sendCommand(
    connection: ConnectorTransportConnection,
    session: LiveConnectorSession,
    type: ConnectorCommandEnvelope["type"],
    payload: unknown,
    correlationId: string | null = null
  ): Promise<ConnectorCommandResponse> {
    const command: ConnectorCommandEnvelope = {
      commandId: randomBytes(12).toString("hex"),
      type,
      restaurantId: session.identity.restaurantId,
      connectorId: session.identity.connectorId,
      correlationId,
      issuedAt: new Date().toISOString(),
      nonce: generateNonce(),
      payload,
    };

    const responsePromise = this.responseRouter.awaitResponse(command.commandId, this.commandTimeoutMs);
    await connection.send({ type: "command", payload: command });

    try {
      return await responsePromise;
    } catch {
      return {
        commandId: command.commandId,
        success: false,
        failureCode: "transport_unavailable",
        message: "Command response timeout",
        payload: null,
      };
    }
  }

  private buildExecutePrintCommand(
    session: LiveConnectorSession,
    request: GatewayPrintRouteRequest
  ): ConnectorCommandEnvelope {
    const payload: ExecutePrintCommandPayload = {
      jobId: request.jobId,
      orderId: request.orderId,
      printPayload: request.payload,
    };

    return {
      commandId: randomBytes(12).toString("hex"),
      type: "execute_print",
      restaurantId: session.identity.restaurantId,
      connectorId: session.identity.connectorId,
      correlationId: request.correlationId,
      issuedAt: new Date().toISOString(),
      nonce: generateNonce(),
      payload,
    };
  }
}
