import { randomUUID } from "node:crypto";
import type {
  ConnectorCancelCommand,
  ConnectorPrintCommand,
  DiscoverPrintersQuery,
  GetPrinterCapabilitiesQuery,
  GetPrinterStatusQuery,
  PrintConnectorApi,
  SelectPrinterCommand,
  SelectedPrinterDto,
} from "../../print-connector/contracts/PrintConnectorApi";
import type { PrintExecutionResult } from "../../print-connector/domain/PrintExecutionResult";
import { failureResultMessage } from "../../print-connector/runtime/PrintFailureMapper";
import type { ConnectorGatewayService } from "../services/ConnectorGatewayService";

function buildFailedPrintResult(
  command: ConnectorPrintCommand,
  printerId: string,
  failureReason: PrintExecutionResult["failureReason"],
  message: string
): PrintExecutionResult {
  return {
    executionId: randomUUID(),
    printJobId: command.printJobId,
    restaurantId: command.restaurantId,
    printerId,
    success: false,
    failureReason,
    message,
    completedAt: new Date().toISOString(),
  };
}

function toSelectedPrinterDto(command: SelectPrinterCommand): SelectedPrinterDto {
  return {
    restaurantId: command.restaurantId,
    printerId: command.printerId,
    printerName: command.printerName,
    platform: command.platform,
    transport: command.transport,
    selectedAt: new Date().toISOString(),
  };
}

/**
 * Routes all native connector operations through Connector Gateway → RLC.
 * Printer Catalog SSOT is restaurant_printers (ADR-ARCH-017). No cloud selection persistence.
 */
export class GatewayRoutedPrintConnectorApi implements PrintConnectorApi {
  constructor(private readonly gateway: ConnectorGatewayService) {}

  async discoverPrinters(query: DiscoverPrintersQuery) {
    const result = await this.gateway.routeDiscoverPrinters({
      restaurantId: query.restaurantId,
      requestedAt: new Date().toISOString(),
    });

    if (!result.routed || result.printers == null) {
      return [];
    }

    return result.printers;
  }

  async getPrinterCapabilities(query: GetPrinterCapabilitiesQuery) {
    const result = await this.gateway.routeGetPrinterStatus({
      restaurantId: query.restaurantId,
      printerId: query.printerId,
      requestedAt: new Date().toISOString(),
    });

    if (!result.routed) {
      return null;
    }

    return result.capabilities;
  }

  async getStatus(query: GetPrinterStatusQuery) {
    const result = await this.gateway.routeGetPrinterStatus({
      restaurantId: query.restaurantId,
      printerId: query.printerId,
      requestedAt: new Date().toISOString(),
    });

    if (!result.routed) {
      return null;
    }

    return result.status;
  }

  async selectPrinter(command: SelectPrinterCommand) {
    const routed = await this.gateway.routeSelectPrinter({
      restaurantId: command.restaurantId,
      printerId: command.printerId,
      printerName: command.printerName,
      platform: command.platform,
      transport: command.transport,
      requestedAt: new Date().toISOString(),
    });

    if (!routed.routed) {
      throw new Error(routed.message ?? routed.failureReason ?? "connector_select_failed");
    }

    return routed.selected ?? toSelectedPrinterDto(command);
  }

  async getSelectedPrinter(_restaurantId: number): Promise<SelectedPrinterDto | null> {
    return null;
  }

  async print(command: ConnectorPrintCommand): Promise<PrintExecutionResult> {
    const result = await this.gateway.routeExecutePrint({
      jobId: command.printJobId,
      restaurantId: command.restaurantId,
      orderId: command.orderId,
      correlationId: null,
      payload: command.payload,
      printerId: command.printerId,
      requestedAt: new Date().toISOString(),
    });

    if (result.execution) {
      return result.execution;
    }

    return buildFailedPrintResult(
      command,
      command.printerId ?? "",
      "connection_lost",
      result.message ?? failureResultMessage("connection_lost")
    );
  }

  async cancel(command: ConnectorCancelCommand): Promise<PrintExecutionResult> {
    const result = await this.gateway.routeCancelPrint({
      restaurantId: command.restaurantId,
      executionId: command.executionId,
      printJobId: command.printJobId,
      requestedAt: new Date().toISOString(),
    });

    if (result.execution) {
      return result.execution;
    }

    return {
      executionId: command.executionId,
      printJobId: command.printJobId,
      restaurantId: command.restaurantId,
      printerId: "",
      success: false,
      failureReason: "connection_lost",
      message: result.message ?? failureResultMessage("connection_lost"),
      completedAt: new Date().toISOString(),
    };
  }
}
