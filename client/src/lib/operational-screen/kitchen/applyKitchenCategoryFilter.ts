import type { CategoryFilterPredicate } from "../category-filter/runtimeCategoryFilterManager";
import type { KitchenRuntimeQueue, KitchenRuntimeTicket } from "./kitchenRuntimeReadModel";

/**
 * Apply compiled category filter predicate to kitchen read model.
 * O(n) over tickets — predicate compiled once, not per render.
 */
export function applyKitchenCategoryFilter(
  queue: KitchenRuntimeQueue,
  predicate: CategoryFilterPredicate,
  options?: { missingCategoryData?: boolean }
): KitchenRuntimeQueue {
  if (options?.missingCategoryData) {
    return queue;
  }

  const filterTicket = (ticket: KitchenRuntimeTicket): boolean =>
    predicate(ticket.orderCategoryIds);

  const pending = queue.columns.pending.filter(filterTicket);
  const preparing = queue.columns.preparing.filter(filterTicket);
  const ready = queue.columns.ready.filter(filterTicket);
  const tickets = queue.tickets.filter(filterTicket);

  return {
    ...queue,
    tickets,
    columns: { pending, preparing, ready },
    meta: {
      totalVisible: tickets.length,
      counts: {
        pending: pending.length,
        preparing: preparing.length,
        ready: ready.length,
      },
    },
  };
}
