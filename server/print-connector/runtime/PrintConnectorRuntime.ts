import type { PrintConnectorApi } from "../contracts/PrintConnectorApi";
import type { DeploymentRuntime } from "../contracts/deployment/DeploymentRuntime";
import type { PrinterSelectionRepository } from "../contracts/PrinterSelectionRepository";
import type { ConnectorCancelCommand } from "../contracts/PrintConnectorApi";
import type { ConnectorPrintCommand } from "../contracts/PrintConnectorApi";
import type { DiscoverPrintersQuery } from "../contracts/PrintConnectorApi";
import type { GetPrinterCapabilitiesQuery } from "../contracts/PrintConnectorApi";
import type { GetPrinterStatusQuery } from "../contracts/PrintConnectorApi";
import type { SelectPrinterCommand } from "../contracts/PrintConnectorApi";
import type { PrintExecutionResult } from "../domain/PrintExecutionResult";
import { failureResultMessage } from "./PrintFailureMapper";
import { resolveTransportAdapter } from "../transport/TransportAdapters";
import { randomUUID } from "node:crypto";

/**
 * Connector runtime — integration orchestration only. No business or order logic.
 * Platform and transport access is delegated to DeploymentRuntime.
 */
export class PrintConnectorRuntime implements PrintConnectorApi {
  private readonly transports;
  private readonly activeExecutions = new Map<string, number>();

  constructor(
    private readonly deployment: DeploymentRuntime,
    private readonly selectionRepository: PrinterSelectionRepository
  ) {
    this.transports = deployment.getTransportAdapters();
  }

  private get platform() {
    return this.deployment.getPlatformAdapter();
  }

  async discoverPrinters(_query: DiscoverPrintersQuery) {
    return this.platform.discoverPrinters();
  }

  async getPrinterCapabilities(query: GetPrinterCapabilitiesQuery) {
    return this.platform.getPrinterCapabilities(query.printerId);
  }

  async selectPrinter(command: SelectPrinterCommand) {
    return this.selectionRepository.saveSelection({
      restaurantId: command.restaurantId,
      printerId: command.printerId,
      printerName: command.printerName,
      platform: command.platform,
      transport: command.transport,
    });
  }

  getSelectedPrinter(restaurantId: number) {
    return this.selectionRepository.getSelected(restaurantId);
  }

  async print(command: ConnectorPrintCommand): Promise<PrintExecutionResult> {
    const completedAt = new Date().toISOString();
    const executionId = randomUUID();

    const selected =
      command.printerId != null
        ? { printerId: command.printerId }
        : await this.selectionRepository.getSelected(command.restaurantId);

    if (!selected?.printerId) {
      return {
        executionId,
        printJobId: command.printJobId,
        restaurantId: command.restaurantId,
        printerId: "",
        success: false,
        failureReason: "no_printer_selected",
        message: failureResultMessage("no_printer_selected"),
        completedAt,
      };
    }

    const printers = await this.platform.discoverPrinters();
    const printer = printers.find((p) => p.id === selected.printerId);
    if (!printer) {
      return {
        executionId,
        printJobId: command.printJobId,
        restaurantId: command.restaurantId,
        printerId: selected.printerId,
        success: false,
        failureReason: "printer_offline",
        message: failureResultMessage("printer_offline"),
        completedAt,
      };
    }

    const transport = resolveTransportAdapter(printer, this.transports);
    if (!transport) {
      return {
        executionId,
        printJobId: command.printJobId,
        restaurantId: command.restaurantId,
        printerId: selected.printerId,
        success: false,
        failureReason: "unsupported_capability",
        message: failureResultMessage("unsupported_capability"),
        completedAt,
      };
    }

    this.activeExecutions.set(executionId, command.printJobId);

    const result = await transport.execute(
      {
        executionId,
        restaurantId: command.restaurantId,
        printJobId: command.printJobId,
        orderId: command.orderId,
        printerId: selected.printerId,
        payload: command.payload,
        requestedAt: new Date().toISOString(),
      },
      printer,
      this.platform
    );

    if (result.success) {
      this.activeExecutions.delete(executionId);
    }

    return result;
  }

  async cancel(command: ConnectorCancelCommand): Promise<PrintExecutionResult> {
    const result = await this.platform.cancelPrint(command.executionId, command.printJobId);
    this.activeExecutions.delete(command.executionId);
    return {
      ...result,
      restaurantId: command.restaurantId,
    };
  }

  async getStatus(query: GetPrinterStatusQuery) {
    return this.platform.getPrinterStatus(query.printerId);
  }
}
