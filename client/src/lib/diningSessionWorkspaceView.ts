import { TRPCClientError } from "@trpc/client";

export type WorkspaceTimelineEvent = {
  id: number;
  eventType: string;
  createdAt: string;
  orderNumber?: string | null;
  displayReference?: string | null;
  totalAmount?: string | null;
};

export function isSessionNotFoundError(error: unknown): boolean {
  if (!(error instanceof TRPCClientError)) return false;
  const message = error.message.toLowerCase();
  return message.includes("dining session not found") || message.includes("session not found");
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
