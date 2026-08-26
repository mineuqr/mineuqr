/**
 * ORDER-STATE-PROPAGATION-REMEDIATION-1
 * Active order list + kitchen queue cache merge helpers.
 */

import {
  mergeStatusBearingItem,
  mergeStatusBearingList,
  type ReadFreshnessObservation,
} from "./governance";
import { orderStatusFreshnessRank } from "./orderStatusRank";

export type ActiveOrderListLike = {
  items: Array<{ orderId: number; status: string; readyAt?: string | null }>;
  [key: string]: unknown;
};

/**
 * structuralSharing-compatible merge for order.read.listActive results.
 */
export function mergeActiveOrderListCache<T extends ActiveOrderListLike>(
  existing: T | undefined,
  incoming: T,
  onDecision?: (observation: ReadFreshnessObservation) => void
): T {
  if (!incoming?.items) return (existing as T) ?? incoming;
  if (!existing?.items) {
    return {
      ...incoming,
      items: mergeStatusBearingList(undefined, incoming.items, onDecision),
    };
  }

  return {
    ...incoming,
    items: mergeStatusBearingList(existing.items, incoming.items, onDecision),
  };
}

export type KitchenTicketLike = {
  orderId: number;
  status: string;
  readyAt?: string | null;
  lastEventId?: string | null;
  [key: string]: unknown;
};

export type KitchenQueueColumnsLike = {
  pending: KitchenTicketLike[];
  preparing: KitchenTicketLike[];
  ready: KitchenTicketLike[];
};

export type KitchenQueueLike = {
  columns: KitchenQueueColumnsLike;
  [key: string]: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isActiveOrderListLike(value: unknown): value is ActiveOrderListLike {
  return isRecord(value) && Array.isArray(value.items);
}

export function isKitchenQueueLike(value: unknown): value is KitchenQueueLike {
  if (!isRecord(value) || !isRecord(value.columns)) return false;
  const columns = value.columns;
  return (
    Array.isArray(columns.pending) &&
    Array.isArray(columns.preparing) &&
    Array.isArray(columns.ready)
  );
}

function flattenKitchenTickets(
  columns: KitchenQueueColumnsLike
): KitchenTicketLike[] {
  return [...columns.pending, ...columns.preparing, ...columns.ready];
}

function pickFresherTicket(
  a: KitchenTicketLike | undefined,
  b: KitchenTicketLike
): KitchenTicketLike {
  if (!a) return b;
  const rankA = orderStatusFreshnessRank(a.status) ?? 0;
  const rankB = orderStatusFreshnessRank(b.status) ?? 0;
  return rankB >= rankA ? b : a;
}

function indexTicketsById(
  tickets: KitchenTicketLike[]
): Map<number, KitchenTicketLike> {
  const map = new Map<number, KitchenTicketLike>();
  for (const ticket of tickets) {
    map.set(ticket.orderId, pickFresherTicket(map.get(ticket.orderId), ticket));
  }
  return map;
}

function columnForStatus(
  status: string
): keyof KitchenQueueColumnsLike | null {
  if (status === "pending" || status === "preparing" || status === "ready") {
    return status;
  }
  return null;
}

/**
 * Merge kitchen queue columns so a stale preparing ticket cannot displace a
 * fresher ready ticket (or move it backwards across columns).
 */
export function mergeKitchenQueueCache<T extends KitchenQueueLike>(
  existing: T | undefined,
  incoming: T,
  onDecision?: (observation: ReadFreshnessObservation) => void
): T {
  if (!incoming?.columns) return existing as T;

  const existingById = existing?.columns
    ? indexTicketsById(flattenKitchenTickets(existing.columns))
    : new Map<number, KitchenTicketLike>();
  const incomingFlat = flattenKitchenTickets(incoming.columns);

  const mergedById = new Map<number, KitchenTicketLike>();
  for (const ticket of incomingFlat) {
    const prev = existingById.get(ticket.orderId);
    mergedById.set(
      ticket.orderId,
      mergeStatusBearingItem(prev, ticket, onDecision)
    );
  }

  const columns: KitchenQueueColumnsLike = {
    pending: [],
    preparing: [],
    ready: [],
  };

  for (const ticket of mergedById.values()) {
    const column = columnForStatus(ticket.status);
    if (!column) continue;
    columns[column].push(ticket);
  }

  // Preserve FIFO-ish order within columns from incoming where possible.
  for (const key of ["pending", "preparing", "ready"] as const) {
    const incomingOrder = new Map(
      incoming.columns[key].map((t, index) => [t.orderId, index])
    );
    columns[key].sort((a, b) => {
      const ia = incomingOrder.get(a.orderId);
      const ib = incomingOrder.get(b.orderId);
      if (ia != null && ib != null) return ia - ib;
      if (ia != null) return -1;
      if (ib != null) return 1;
      return a.orderId - b.orderId;
    });
  }

  return {
    ...incoming,
    columns,
  };
}
