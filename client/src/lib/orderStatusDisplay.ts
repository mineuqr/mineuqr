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
