/**
 * TABLE-MANAGEMENT-1 UX-1C — owner session timeline copy.
 */

const TIMELINE_EVENT = {
  SESSION_OPENED: "SESSION_OPENED",
  ORDER_CREATED: "ORDER_CREATED",
  BILL_REQUESTED: "BILL_REQUESTED",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  SESSION_CLOSED: "SESSION_CLOSED",
} as const;

type Lang = "ar" | "en";

export type TimelineEventLike = {
  eventType: string;
  orderNumber?: string | null;
  totalAmount?: string | null;
};

/** V1 + future event labels — unknown types fall back to eventType. */
export function formatTimelineEventDescription(
  event: TimelineEventLike,
  language: Lang,
  currencySymbol = "ر.س"
): string {
  if (event.eventType === TIMELINE_EVENT.SESSION_OPENED) {
    return language === "ar" ? "تم فتح الجلسة" : "Session opened";
  }

  if (event.eventType === TIMELINE_EVENT.ORDER_CREATED) {
    const orderRef = event.orderNumber?.trim() ?? "";
    const base =
      language === "ar"
        ? orderRef
          ? `تم إنشاء الطلب ${orderRef}`
          : "تم إنشاء طلب"
        : orderRef
          ? `Order ${orderRef} created`
          : "Order created";
    if (event.totalAmount) {
      return `${base} · ${event.totalAmount} ${currencySymbol}`;
    }
    return base;
  }

  if (event.eventType === TIMELINE_EVENT.BILL_REQUESTED) {
    return language === "ar" ? "تم طلب الفاتورة" : "Bill requested";
  }

  if (event.eventType === TIMELINE_EVENT.PAYMENT_PENDING) {
    return language === "ar" ? "الدفع قيد المعالجة" : "Payment pending";
  }

  if (event.eventType === TIMELINE_EVENT.SESSION_CLOSED) {
    return language === "ar" ? "تم إغلاق الجلسة" : "Session closed";
  }

  return event.eventType;
}
