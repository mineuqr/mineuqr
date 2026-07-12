import type { CategoryFilterPredicate } from "../category-filter/runtimeCategoryFilterManager";
import {
  collectOrderCategoryIds,
  projectKitchenTicketWithLineItems,
  type KitchenRuntimeQueue,
  type KitchenRuntimeTicket,
} from "./kitchenRuntimeReadModel";
import type { KitchenTicketDto } from "@/lib/kitchen/types";
import { isMenuItemKitchenLine } from "@/lib/kitchen/lineProjection";

function filterTicketLineItems(
  lineItems: KitchenTicketDto["lineItems"],
  predicate: CategoryFilterPredicate,
  filterEnabled: boolean
): KitchenTicketDto["lineItems"] {
  return lineItems.filter((item) => {
    if (isMenuItemKitchenLine(item)) {
      return predicate(item.category.categoryId);
    }
    // Offers carry no category — visible only when category filter is inactive.
    return !filterEnabled;
  });
}

function projectFilteredTicket(
  ticket: KitchenRuntimeTicket,
  predicate: CategoryFilterPredicate,
  filterEnabled: boolean
): KitchenRuntimeTicket | null {
  const lineItems = filterTicketLineItems(ticket.lineItems, predicate, filterEnabled);
  if (lineItems.length === 0) {
    return null;
  }
  if (!filterEnabled) {
    return ticket;
  }
  return projectKitchenTicketWithLineItems(ticket, lineItems);
}

/**
 * Apply compiled category filter to kitchen read model at line-item granularity.
 * O(n) over tickets — predicate compiled once, not per render.
 * Order aggregate identity is preserved; only visible line items change.
 */
export function applyKitchenCategoryFilter(
  queue: KitchenRuntimeQueue,
  predicate: CategoryFilterPredicate,
  filterEnabled = false
): KitchenRuntimeQueue {
  const filterColumn = (tickets: KitchenRuntimeTicket[]): KitchenRuntimeTicket[] =>
    tickets
      .map((ticket) => projectFilteredTicket(ticket, predicate, filterEnabled))
      .filter((ticket): ticket is KitchenRuntimeTicket => ticket != null);

  const pending = filterColumn(queue.columns.pending);
  const preparing = filterColumn(queue.columns.preparing);
  const ready = filterColumn(queue.columns.ready);
  const tickets = filterColumn(queue.tickets);

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
