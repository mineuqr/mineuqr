import type { KitchenQueueResult, KitchenTicketDto } from "@/lib/kitchen/types";
import type { CategoryProjectionReadMeta } from "@/lib/kitchen/categoryProjection";
import { isMenuItemKitchenLine } from "@/lib/kitchen/lineProjection";

/** Runtime kitchen read model — normalized from API, never filtered here. */
export type KitchenRuntimeTicket = KitchenTicketDto & {
  /** Canonical category identifiers for order evaluation (never display labels). */
  orderCategoryIds: number[];
};

export type KitchenRuntimeQueue = {
  generatedAt: string;
  tickets: KitchenRuntimeTicket[];
  columns: {
    pending: KitchenRuntimeTicket[];
    preparing: KitchenRuntimeTicket[];
    ready: KitchenRuntimeTicket[];
  };
  meta: KitchenQueueResult["meta"];
  projection: CategoryProjectionReadMeta & {
    projectionSchemaVersion: number;
  };
};

/** Collect unique canonical category ids from projected line items. */
export function collectOrderCategoryIds(
  lineItems: KitchenTicketDto["lineItems"]
): number[] {
  const ids = new Set<number>();
  for (const item of lineItems) {
    if (!isMenuItemKitchenLine(item)) continue;
    ids.add(item.category.categoryId);
  }
  return Array.from(ids);
}

/** Normalize API kitchen queue into runtime read model (unfiltered). */
export function normalizeKitchenReadModel(result: KitchenQueueResult): KitchenRuntimeQueue {
  const mapTicket = (ticket: KitchenTicketDto): KitchenRuntimeTicket => ({
    ...ticket,
    orderCategoryIds: collectOrderCategoryIds(ticket.lineItems),
  });

  const tickets = result.tickets.map(mapTicket);

  return {
    generatedAt: result.generatedAt,
    tickets,
    columns: {
      pending: result.columns.pending.map(mapTicket),
      preparing: result.columns.preparing.map(mapTicket),
      ready: result.columns.ready.map(mapTicket),
    },
    meta: result.meta,
    projection: {
      projectionSchemaVersion: result.projectionSchemaVersion,
      categoryProjectionVersion: result.categoryProjectionVersion,
      projectionBuildDurationMs: result.projectionBuildDurationMs,
      projectionIntegrity: result.projectionIntegrity,
    },
  };
}
