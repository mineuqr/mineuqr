import type {
  PrintWorkspaceListQuery,
  PrintWorkspaceOrderDetailQuery,
  PrintWorkspaceOrderDetailResult,
  PrintWorkspaceOrderListResult,
  PrintWorkspacePreviewTicketResult,
} from "../contracts/printWorkspaceQueryContracts";
import {
  buildPrintWorkspaceMeta,
  clampPrintWorkspaceLimit,
} from "../contracts/printWorkspaceQueryContracts";
import { DrizzlePrintWorkspaceReadStore } from "../infrastructure/DrizzlePrintWorkspaceReadStore";
import { printingService } from "../../../printing/printingComposition";
import { mapPrintJobToWorkspaceDto } from "../../../printing/read/PrintJobReadMapper";
import { printerManagementService } from "../../../printer-management/printerManagementComposition";

/**
 * Presentation-only read service for the Print Workspace.
 * Order data reads exclusively from order_read_* projection tables.
 * Print job queue reads from the Printing Service persistence boundary.
 */
export class PrintWorkspaceReadService {
  constructor(private readonly store = new DrizzlePrintWorkspaceReadStore()) {}

  async listOrders(query: PrintWorkspaceListQuery): Promise<PrintWorkspaceOrderListResult> {
    const limit = clampPrintWorkspaceLimit(query.limit);
    const items = await this.store.listOrders({ ...query, limit: limit + 1 });
    const hasMore = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.createdAt ?? null : null;

    return {
      ...buildPrintWorkspaceMeta(),
      items: pageItems,
      pageInfo: {
        hasMore,
        nextCursor,
        limit,
      },
    };
  }

  async getOrderDetail(
    query: PrintWorkspaceOrderDetailQuery
  ): Promise<PrintWorkspaceOrderDetailResult | null> {
    const detail = await this.store.getOrderDetail(query);
    if (!detail) return null;

    const printJobs = await printingService.listJobsForOrder(query.restaurantId, query.orderId);
    const currentPrinter = await printerManagementService.getCurrentPrinter(query.restaurantId);
    const printerName = currentPrinter.printer?.displayName ?? null;

    const printJobDtos = await Promise.all(
      printJobs.map(async (job) => {
        const attempts = await printingService.listAttemptsForJob(job.id);
        return mapPrintJobToWorkspaceDto(job, { printerName, attempts });
      })
    );

    return {
      ...buildPrintWorkspaceMeta(),
      order: detail.order,
      timeline: detail.timeline,
      printJobs: printJobDtos.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }

  async previewTicket(
    query: PrintWorkspaceOrderDetailQuery
  ): Promise<PrintWorkspacePreviewTicketResult | null> {
    const payload = await printingService.buildPayloadForOrder({
      restaurantId: query.restaurantId,
      orderId: query.orderId,
      source: "operator",
    });
    if (!payload) return null;

    return {
      ...buildPrintWorkspaceMeta(),
      payload,
    };
  }
}

export const printWorkspaceReadService = new PrintWorkspaceReadService();
