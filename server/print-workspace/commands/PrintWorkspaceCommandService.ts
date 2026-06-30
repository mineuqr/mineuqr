import type {
  CancelPrintCommand,
  MarkPrintedCommand,
  PreviewTicketCommand,
  PrintOrderCommand,
  PrintWorkspaceActionPort,
  ReprintOrderCommand,
} from "../read/contracts/printWorkspaceActionContracts";
import { printingService } from "../../printing/printingComposition";
import type { PrintJobRecord } from "../../printing/contracts/repositories/PrintJobRepository";

function idempotencyForOperator(
  restaurantId: number,
  orderId: number,
  action: string,
  operatorUserId: number
): string {
  return `operator:${action}:${restaurantId}:${orderId}:${operatorUserId}:${Date.now()}`;
}

export class PrintWorkspaceCommandService implements PrintWorkspaceActionPort {
  async printOrder(command: PrintOrderCommand): Promise<void> {
    const payload = await printingService.buildPayloadForOrder({
      restaurantId: command.restaurantId,
      orderId: command.orderId,
      source: "operator",
      operatorUserId: command.operatorUserId,
    });
    if (!payload) {
      throw new Error("Order is not available in the print read model");
    }

    await printingService.requestPrint({
      restaurantId: command.restaurantId,
      orderId: command.orderId,
      orderNumber: command.orderNumber,
      source: "operator",
      idempotencyKey: idempotencyForOperator(
        command.restaurantId,
        command.orderId,
        "print",
        command.operatorUserId
      ),
      operatorUserId: command.operatorUserId,
      payload,
      dispatch: true,
    });
  }

  async reprint(command: ReprintOrderCommand): Promise<void> {
    const payload = await printingService.buildPayloadForOrder({
      restaurantId: command.restaurantId,
      orderId: command.orderId,
      source: "reprint",
      operatorUserId: command.operatorUserId,
      reason: command.reason ?? null,
    });
    if (!payload) {
      throw new Error("Order is not available in the print read model");
    }

    await printingService.requestPrint({
      restaurantId: command.restaurantId,
      orderId: command.orderId,
      orderNumber: command.orderNumber,
      source: "reprint",
      idempotencyKey: idempotencyForOperator(
        command.restaurantId,
        command.orderId,
        "reprint",
        command.operatorUserId
      ),
      operatorUserId: command.operatorUserId,
      reason: command.reason ?? null,
      payload,
      dispatch: true,
    });
  }

  async preview(command: PreviewTicketCommand): Promise<void> {
    const payload = await printingService.buildPayloadForOrder({
      restaurantId: command.restaurantId,
      orderId: command.orderId,
      source: "operator",
      operatorUserId: command.operatorUserId,
    });
    if (!payload) {
      throw new Error("Order is not available in the print read model");
    }
  }

  async markPrinted(command: MarkPrintedCommand): Promise<void> {
    const jobs = await printingService.listJobsForOrder(command.restaurantId, command.orderId);
    const active = jobs.find((job: PrintJobRecord) => ["dispatched", "printing"].includes(job.status));
    if (!active) {
      throw new Error("No active print job to mark as printed");
    }

    const updated = await printingService.markPrinted({
      restaurantId: command.restaurantId,
      orderId: command.orderId,
      jobId: active.id,
      operatorUserId: command.operatorUserId,
      printedAt: command.printedAt,
    });

    if (!updated) {
      throw new Error("Failed to mark print job as printed");
    }
  }

  async cancelPrint(command: CancelPrintCommand): Promise<void> {
    const jobs = await printingService.listJobsForOrder(command.restaurantId, command.orderId);
    const active = jobs.find((job: PrintJobRecord) =>
      ["pending", "dispatched", "printing"].includes(job.status)
    );
    if (!active) {
      throw new Error("No active print job to cancel");
    }

    const updated = await printingService.cancelPrint({
      restaurantId: command.restaurantId,
      orderId: command.orderId,
      jobId: active.id,
      operatorUserId: command.operatorUserId,
      reason: command.reason,
    });

    if (!updated) {
      throw new Error("Failed to cancel print job");
    }
  }
}

export const printWorkspaceCommandService = new PrintWorkspaceCommandService();
