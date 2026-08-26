import type { OrderLifecycleStatus } from "@/lib/orderStatusDisplay";
import type { RouterOutputs } from "@/lib/trpc";

type ListActiveData = RouterOutputs["order"]["read"]["listActive"];
type OrderDetailData = RouterOutputs["order"]["read"]["getDetail"];

export function listActiveInputsFor(restaurantId: number) {
  return [
    { restaurantId, limit: 100 },
    { restaurantId, status: undefined, limit: 100 },
    { restaurantId, status: "pending" as const, limit: 100 },
    { restaurantId, status: "preparing" as const, limit: 100 },
    { restaurantId, status: "ready" as const, limit: 100 },
  ];
}

export function patchListActive(
  data: ListActiveData | undefined,
  orderId: number,
  status: OrderLifecycleStatus
): ListActiveData | undefined {
  if (!data?.items) return data;
  const terminal = status === "served" || status === "cancelled";
  return {
    ...data,
    items: terminal
      ? data.items.filter((item) => item.orderId !== orderId)
      : data.items.map((item) =>
          item.orderId === orderId ? { ...item, status } : item
        ),
  };
}

export function patchOrderDetail(
  data: OrderDetailData | undefined,
  status: OrderLifecycleStatus
): OrderDetailData | undefined {
  if (!data?.order) return data;
  return {
    ...data,
    order: { ...data.order, status },
  };
}
