import type {
  ConnectorCommandEnvelope,
  ConnectorCommandResponse,
  CancelPrintCommandPayload,
  ExecutePrintCommandPayload,
} from "../../connector-session/contracts/sessionContracts";
import type { ConnectorCommandHandler } from "../contracts/ConnectorCommandHandler";
import type { LocalConnectorConfigProvider } from "../contracts/LocalConnectorConfig";
import {
  LocalConnectorRuntimeFacade,
  type DiscoverPrintersCommandPayload,
  type GetPrinterStatusCommandPayload,
} from "../services/LocalConnectorRuntimeFacade";
import {
  mapPrintFailureToInfrastructure,
  mapWindowsErrorMessage,
} from "../windows/mapWindowsInfrastructureFailure";

/**
 * Routes gateway session commands to RLC PrintConnectorRuntime (Windows).
 */
export class RuntimeConnectorCommandHandler implements ConnectorCommandHandler {
  private readonly facade: LocalConnectorRuntimeFacade;

  constructor(
    runtime: import("../../print-connector/contracts/PrintConnectorApi").PrintConnectorApi,
    private readonly configProvider: LocalConnectorConfigProvider
  ) {
    this.facade = new LocalConnectorRuntimeFacade(runtime);
  }

  async handle(command: ConnectorCommandEnvelope): Promise<ConnectorCommandResponse> {
    const config = this.configProvider.load();

    try {
      switch (command.type) {
        case "discover_printers":
          return this.handleDiscover(command, config.restaurantId);
        case "get_printer_status":
          return this.handleStatus(command, config.restaurantId);
        case "execute_print":
          return this.handleExecutePrint(command, config.restaurantId);
        case "cancel_print":
          return this.handleCancelPrint(command, config.restaurantId);
        default:
          return {
            commandId: command.commandId,
            success: false,
            failureCode: "connector_unavailable",
            message: `Unsupported command: ${command.type}`,
            payload: null,
          };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        commandId: command.commandId,
        success: false,
        failureCode: mapWindowsErrorMessage(message),
        message,
        payload: null,
      };
    }
  }

  private async handleDiscover(
    command: ConnectorCommandEnvelope,
    restaurantId: number
  ): Promise<ConnectorCommandResponse> {
    const payload = (command.payload ?? {}) as DiscoverPrintersCommandPayload;

    if (payload.action === "select" && payload.printerId && payload.printerName) {
      const selected = await this.facade.selectPrinter(restaurantId, {
        id: payload.printerId,
        name: payload.printerName,
        platform: (payload.platform ?? "windows") as "windows",
        transport: (payload.transport ?? "usb") as "usb",
      });

      return {
        commandId: command.commandId,
        success: true,
        failureCode: null,
        message: null,
        payload: { selected },
      };
    }

    const printers = await this.facade.discoverPrinters(restaurantId);
    return {
      commandId: command.commandId,
      success: true,
      failureCode: null,
      message: null,
      payload: { printers },
    };
  }

  private async handleStatus(
    command: ConnectorCommandEnvelope,
    restaurantId: number
  ): Promise<ConnectorCommandResponse> {
    const payload = command.payload as GetPrinterStatusCommandPayload;
    const status = await this.facade.getPrinterStatus(restaurantId, payload.printerId);
    const capabilities = await this.facade.getPrinterCapabilities(restaurantId, payload.printerId);

    return {
      commandId: command.commandId,
      success: status != null,
      failureCode: status == null ? "connector_unavailable" : null,
      message: status == null ? "Printer not found" : null,
      payload: { status, capabilities },
    };
  }

  private async handleExecutePrint(
    command: ConnectorCommandEnvelope,
    restaurantId: number
  ): Promise<ConnectorCommandResponse> {
    const payload = command.payload as ExecutePrintCommandPayload;
    const result = await this.facade.print(
      restaurantId,
      payload.jobId,
      payload.orderId,
      payload.printPayload,
      payload.printerId
    );

    return {
      commandId: command.commandId,
      success: result.success,
      failureCode: result.success ? null : mapPrintFailureToInfrastructure(result.failureReason),
      message: result.message ?? null,
      payload: { execution: result },
    };
  }

  private async handleCancelPrint(
    command: ConnectorCommandEnvelope,
    restaurantId: number
  ): Promise<ConnectorCommandResponse> {
    const payload = command.payload as CancelPrintCommandPayload;
    const result = await this.facade.cancel(restaurantId, payload.executionId, payload.printJobId);

    return {
      commandId: command.commandId,
      success: result.success,
      failureCode: result.success ? null : mapPrintFailureToInfrastructure(result.failureReason),
      message: result.message ?? null,
      payload: { execution: result },
    };
  }
}
