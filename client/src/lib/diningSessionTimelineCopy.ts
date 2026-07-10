/**
 * TABLE-MANAGEMENT-1 UX-1C — owner session timeline copy.
 * SETTLEMENT-ARCHITECTURE-1A — settlement events.
 */

const TIMELINE_EVENT = {
  SESSION_OPENED: "SESSION_OPENED",
  ORDER_CREATED: "ORDER_CREATED",
  SESSION_PAID: "SESSION_PAID",
  SESSION_COMPLIMENTARY: "SESSION_COMPLIMENTARY",
  SESSION_CLOSED: "SESSION_CLOSED",
} as const;

type Lang = "ar" | "en";

export type TimelineEventLike = {
  eventType: string;
  orderNumber?: string | null;
  displayReference?: string | null;
  totalAmount?: string | null;
};

/** V1 + settlement event labels — unknown types fall back to eventType. */
export function formatTimelineEventDescription(
  event: TimelineEventLike,
  language: Lang,
  currencySymbol = "ر.س"
): string {
  if (event.eventType === TIMELINE_EVENT.SESSION_OPENED) {
    return language === "ar" ? "تم فتح الجلسة" : "Session opened";
  }

  if (event.eventType === TIMELINE_EVENT.ORDER_CREATED) {
    const orderRef = (event.displayReference ?? event.orderNumber)?.trim() ?? "";
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

  if (event.eventType === TIMELINE_EVENT.SESSION_PAID) {
    return language === "ar" ? "تم تسجيل الدفع" : "Session paid";
  }

  if (event.eventType === TIMELINE_EVENT.SESSION_COMPLIMENTARY) {
    return language === "ar" ? "جلسة ضيافة" : "Session complimentary";
  }

  if (event.eventType === TIMELINE_EVENT.SESSION_CLOSED) {
    return language === "ar" ? "تم إغلاق الجلسة" : "Session closed";
  }

  return event.eventType;
}
