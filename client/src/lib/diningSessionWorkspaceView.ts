import type { DiningSessionStatus } from "@/lib/diningSessionCopy";
import { TRPCClientError } from "@trpc/client";

export type WorkspaceTimelineEvent = {
  id: number;
  eventType: string;
  createdAt: string;
  orderNumber?: string | null;
  displayReference?: string | null;
  totalAmount?: string | null;
};

export type SessionSettlementSummary =
  | { state: "pending" }
  | {
      state: "settled";
      method: "paid" | "complimentary";
      amount: string;
      settledAt: string;
    };

export function isSessionNotFoundError(error: unknown): boolean {
  if (!(error instanceof TRPCClientError)) return false;
  const message = error.message.toLowerCase();
  return message.includes("dining session not found") || message.includes("session not found");
}

export function deriveSettlementSummary(
  events: WorkspaceTimelineEvent[],
  ordersTotalAmount: string,
  status: DiningSessionStatus
): SessionSettlementSummary {
  const paidEvent = [...events]
    .reverse()
    .find((event) => event.eventType === "SESSION_PAID");
  const complimentaryEvent = [...events]
    .reverse()
    .find((event) => event.eventType === "SESSION_COMPLIMENTARY");

  if (paidEvent) {
    return {
      state: "settled",
      method: "paid",
      amount: paidEvent.totalAmount ?? ordersTotalAmount,
      settledAt: paidEvent.createdAt,
    };
  }

  if (complimentaryEvent) {
    return {
      state: "settled",
      method: "complimentary",
      amount: complimentaryEvent.totalAmount ?? ordersTotalAmount,
      settledAt: complimentaryEvent.createdAt,
    };
  }

  if (status === "paid" || status === "complimentary") {
    return {
      state: "settled",
      method: status,
      amount: ordersTotalAmount,
      settledAt: events.find((event) => event.eventType === "SESSION_CLOSED")?.createdAt ?? "",
    };
  }

  return { state: "pending" };
}

type OrderItemLike = { quantity?: number | null };
type OrderWithItemsLike = {
  sessionId?: number | null;
  items?: OrderItemLike[] | null;
};

export function countSessionItems(
  orders: OrderWithItemsLike[],
  sessionId: number
): number {
  return orders
    .filter((order) => order.sessionId === sessionId)
    .reduce((total, order) => {
      const items = order.items ?? [];
      return (
        total +
        items.reduce((sum, item) => {
          const quantity = Number(item.quantity ?? 1);
          return sum + (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
        }, 0)
      );
    }, 0);
}
