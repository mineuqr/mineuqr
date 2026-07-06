import type { KitchenQueueResult, KitchenTicketDto } from "@/lib/kitchen/types";

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
};

type LineItemWithCategory = KitchenTicketDto["lineItems"][number] & {
  categoryId?: number;
};

/** Extract canonical category id from a line item — never uses names or labels. */
export function extractLineItemCategoryId(
  lineItem: KitchenTicketDto["lineItems"][number]
): number | null {
  const extended = lineItem as LineItemWithCategory;
  const id = extended.categoryId;
  if (typeof id === "number" && Number.isInteger(id) && id > 0) {
    return id;
  }
  return null;
}

/** Collect unique canonical category ids for an order's line items. */
export function collectOrderCategoryIds(
  lineItems: KitchenTicketDto["lineItems"]
): number[] {
  const ids = new Set<number>();
  for (const item of lineItems) {
    const categoryId = extractLineItemCategoryId(item);
    if (categoryId != null) ids.add(categoryId);
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
  };
}

/** Whether any ticket in the queue has resolvable category identifiers. */
export function queueHasCategoryData(queue: KitchenRuntimeQueue): boolean {
  return queue.tickets.some((ticket) => ticket.orderCategoryIds.length > 0);
}
