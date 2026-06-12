/** PR-CUX-1A — shared customer-facing order status labels (owner dashboard parity). */

export type OrderLifecycleStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "served"
  | "cancelled";

export const orderStatusLabels: Record<
  OrderLifecycleStatus,
  { ar: string; en: string }
> = {
  pending: { ar: "قيد الانتظار", en: "Pending" },
  preparing: { ar: "قيد التحضير", en: "Preparing" },
  ready: { ar: "جاهز", en: "Ready" },
  served: { ar: "تم التقديم", en: "Served" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
};

export function formatOrderStatusLabel(
  status: OrderLifecycleStatus,
  language: "ar" | "en"
): string {
  return orderStatusLabels[status][language];
}

/** PR-CUX-1B — customer-friendly headline per lifecycle state. */
export const orderStatusHeadlines: Record<
  OrderLifecycleStatus,
  { ar: string; en: string }
> = {
  pending: { ar: "تم استلام طلبك", en: "Your order has been received" },
  preparing: { ar: "جاري تحضير طلبك", en: "Your order is being prepared" },
  ready: { ar: "طلبك جاهز", en: "Your order is ready" },
  served: { ar: "تم تقديم الطلب", en: "Your order has been served" },
  cancelled: { ar: "تم إلغاء الطلب", en: "Your order was cancelled" },
};

export function formatOrderStatusHeadline(
  status: OrderLifecycleStatus,
  language: "ar" | "en"
): string {
  return orderStatusHeadlines[status][language];
}

export const orderLifecycleSteps: OrderLifecycleStatus[] = [
  "pending",
  "preparing",
  "ready",
  "served",
];

export function lifecycleStepIndex(status: OrderLifecycleStatus): number {
  if (status === "cancelled") return -1;
  const idx = orderLifecycleSteps.indexOf(status);
  return idx >= 0 ? idx : 0;
}
