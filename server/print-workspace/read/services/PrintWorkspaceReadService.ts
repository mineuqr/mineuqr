import type {
  PrintWorkspaceListQuery,
  PrintWorkspaceOrderDetailQuery,
  PrintWorkspaceOrderDetailResult,
  PrintWorkspaceOrderListResult,
} from "../contracts/printWorkspaceQueryContracts";
import {
  buildPrintWorkspaceMeta,
  clampPrintWorkspaceLimit,
} from "../contracts/printWorkspaceQueryContracts";
import { DrizzlePrintWorkspaceReadStore } from "../infrastructure/DrizzlePrintWorkspaceReadStore";

/**
 * Presentation-only read service for the Print Workspace.
 * Reads exclusively from order_read_* projection tables.
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
    return {
      ...buildPrintWorkspaceMeta(),
      order: detail.order,
      timeline: detail.timeline,
    };
  }
}

export const printWorkspaceReadService = new PrintWorkspaceReadService();
