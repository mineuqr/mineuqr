import type { PrinterCapability } from "../../print-connector/domain/PrinterCapability";
import type { PrinterInfo } from "../../print-connector/domain/PrinterInfo";
import type { PrinterStatus } from "../../print-connector/domain/PrinterStatus";
import type { PrintExecutionResult } from "../../print-connector/domain/PrintExecutionResult";
import type { SelectedPrinterDto } from "../../print-connector/contracts/PrintConnectorApi";
import type {
  ConnectorCancelPrintExecutionResult,
  ConnectorDiscoveryExecutionResult,
  ConnectorExecutionPort,
  ConnectorExecutionResult,
  ConnectorPrinterStatusExecutionResult,
  ConnectorSelectPrinterExecutionResult,
} from "../../connector-gateway/contracts/ConnectorExecutionPort";
import type {
  GatewayCancelPrintRequest,
  GatewayPrintRouteRequest,
  GatewaySelectPrinterRequest,
} from "../../connector-gateway/contracts/gatewayContracts";
import type { ConnectorCommandRouter } from "../services/ConnectorCommandRouter";
import type { ConnectorSessionManager } from "../services/ConnectorSessionManager";

type DiscoverPrintersPayload = {
  printers?: PrinterInfo[];
  selected?: SelectedPrinterDto;
};

type PrinterStatusPayload = {
  status?: PrinterStatus | null;
  capabilities?: PrinterCapability | null;
};

type PrintExecutionPayload = {
  execution?: PrintExecutionResult;
};

/**
 * Gateway execution port — routes print and discovery commands over authenticated connector sessions.
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
    const session = await this.requireReadySession(connectorInstanceId);
    if (!session.ok) {
      return session.result;
    }

    const response = await this.commandRouter.routePrint(connectorInstanceId, session.session, request);
    return this.mapPrintResponse(response);
  }

  async executeDiscoverPrinters(
    connectorInstanceId: string,
    _restaurantId: number
  ): Promise<ConnectorDiscoveryExecutionResult> {
    const session = await this.requireReadySession(connectorInstanceId);
    if (!session.ok) {
      return session.result;
    }

    const response = await this.commandRouter.routeDiscoverPrinters(connectorInstanceId, session.session);

    if (!response.success) {
      return {
        success: false,
        failureReason: response.failureCode ?? "transport_unavailable",
        message: response.message ?? "Discovery command failed",
      };
    }

    const payload = (response.payload ?? {}) as DiscoverPrintersPayload;
    return { success: true, printers: payload.printers ?? [] };
  }

  async executeGetPrinterStatus(
    connectorInstanceId: string,
    _restaurantId: number,
    printerId: string
  ): Promise<ConnectorPrinterStatusExecutionResult> {
    const session = await this.requireReadySession(connectorInstanceId);
    if (!session.ok) {
      return session.result;
    }

    const response = await this.commandRouter.routeGetPrinterStatus(
      connectorInstanceId,
      session.session,
      printerId
    );

    if (!response.success) {
      return {
        success: false,
        failureReason: response.failureCode ?? "transport_unavailable",
        message: response.message ?? "Printer status command failed",
      };
    }

    const payload = (response.payload ?? {}) as PrinterStatusPayload;
    return {
      success: true,
      status: payload.status ?? null,
      capabilities: payload.capabilities ?? null,
    };
  }

  async executeSelectPrinter(
    connectorInstanceId: string,
    request: GatewaySelectPrinterRequest
  ): Promise<ConnectorSelectPrinterExecutionResult> {
    const session = await this.requireReadySession(connectorInstanceId);
    if (!session.ok) {
      return session.result;
    }

    const response = await this.commandRouter.routeSelectPrinter(
      connectorInstanceId,
      session.session,
      {
        printerId: request.printerId,
        printerName: request.printerName,
        platform: request.platform,
        transport: request.transport,
      }
    );

    if (!response.success) {
      return {
        success: false,
        failureReason: response.failureCode ?? "transport_unavailable",
        message: response.message ?? "Select printer command failed",
      };
    }

    const payload = (response.payload ?? {}) as DiscoverPrintersPayload;
    return { success: true, selected: payload.selected };
  }

  async executeCancelPrint(
    connectorInstanceId: string,
    request: GatewayCancelPrintRequest
  ): Promise<ConnectorCancelPrintExecutionResult> {
    const session = await this.requireReadySession(connectorInstanceId);
    if (!session.ok) {
      return session.result;
    }

    const response = await this.commandRouter.routeCancelPrint(connectorInstanceId, session.session, {
      executionId: request.executionId,
      printJobId: request.printJobId,
    });

    return this.mapCancelResponse(response);
  }

  private async requireReadySession(connectorInstanceId: string) {
    const session = await this.sessionManager.getByConnectorId(connectorInstanceId);
    if (!session) {
      return {
        ok: false as const,
        result: {
          success: false,
          failureReason: "connector_unavailable",
          message: "No active connector session",
        },
      };
    }

    if (session.lifecycle === "disconnected" || session.lifecycle === "connecting") {
      return {
        ok: false as const,
        result: {
          success: false,
          failureReason: "transport_unavailable",
          message: "Connector session not established",
        },
      };
    }

    return { ok: true as const, session };
  }

  private mapPrintResponse(response: {
    success: boolean;
    failureCode: string | null;
    message: string | null;
    payload: unknown | null;
  }): ConnectorExecutionResult {
    const payload = (response.payload ?? {}) as PrintExecutionPayload;
    const execution = payload.execution;

    if (!response.success) {
      return {
        success: false,
        execution: execution ?? undefined,
        failureReason: response.failureCode ?? "transport_unavailable",
        message: response.message ?? "Command failed",
      };
    }

    return {
      success: execution?.success ?? true,
      execution,
    };
  }

  private mapCancelResponse(response: {
    success: boolean;
    failureCode: string | null;
    message: string | null;
    payload: unknown | null;
  }): ConnectorCancelPrintExecutionResult {
    const payload = (response.payload ?? {}) as PrintExecutionPayload;

    if (!response.success) {
      return {
        success: false,
        execution: payload.execution,
        failureReason: response.failureCode ?? "transport_unavailable",
        message: response.message ?? "Cancel command failed",
      };
    }

    return {
      success: payload.execution?.success ?? true,
      execution: payload.execution,
    };
  }
}
