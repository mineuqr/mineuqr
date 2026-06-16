/**
 * ORDER-LINKED-SESSION-1 — view-only mode banner copy.
 */

type Lang = "ar" | "en";

export function getOrderingSessionConsumedLines(language: Lang): string[] {
  if (language === "ar") {
    return [
      "لديك طلب قيد التنفيذ.",
      "يمكنك متابعة حالة الطلب من صفحة التتبع.",
      "لإنشاء طلب جديد يرجى إعادة فتح رمز الطاولة بعد انتهاء الطلب الحالي.",
    ];
  }
  return [
    "You have an order in progress.",
    "You can track your order from the tracking page.",
    "To place a new order, please scan the table QR code again.",
  ];
}

export function getOrderingSessionTrackingLinkLabel(language: Lang): string {
  return language === "ar" ? "متابعة حالة الطلب" : "Track your order";
}
