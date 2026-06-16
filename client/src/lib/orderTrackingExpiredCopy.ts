/** TRACKING-EXPIRY-1 — expired tracking page copy. */

type Lang = "ar" | "en";

export function getOrderTrackingExpiredLines(language: Lang): string[] {
  if (language === "ar") {
    return [
      "انتهت صلاحية صفحة التتبع.",
      "تم إكمال هذا الطلب.",
      "لإنشاء طلب جديد يرجى مسح رمز الطاولة.",
    ];
  }
  return [
    "This tracking page has expired.",
    "This order session is complete.",
    "To place a new order, please scan the table QR code.",
  ];
}
