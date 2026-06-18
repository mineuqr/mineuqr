/**
 * TABLE-MANAGEMENT-1 D4 — dining session banner copy.
 */

export type DiningSessionStatus =
  | "open"
  | "bill_requested"
  | "payment_pending"
  | "closed";

type Lang = "ar" | "en";

export function getDiningSessionBannerLines(
  status: DiningSessionStatus,
  language: Lang
): string[] {
  if (language === "ar") {
    switch (status) {
      case "open":
        return ["جلسة الطاولة نشطة.", "يمكنك إضافة طلبات جديدة."];
      case "bill_requested":
        return ["تم طلب الفاتورة.", "يرجى انتظار الموظف لإتمام الدفع."];
      case "payment_pending":
        return ["الدفع قيد المعالجة.", "يرجى انتظار الموظف."];
      case "closed":
        return ["انتهت جلسة الطاولة.", "للطلب مجدداً يرجى مسح رمز الطاولة عند بدء جلسة جديدة."];
    }
  }

  switch (status) {
    case "open":
      return ["Your table session is active.", "You can place additional orders."];
    case "bill_requested":
      return ["The bill has been requested.", "Please wait for staff to collect payment."];
    case "payment_pending":
      return ["Payment is being processed.", "Please wait for staff."];
    case "closed":
      return [
        "This table session has ended.",
        "To order again, scan the table QR when a new session starts.",
      ];
  }
}

export function getDiningSessionBannerTitle(
  status: DiningSessionStatus,
  language: Lang
): string {
  if (language === "ar") {
    switch (status) {
      case "open":
        return "جلسة نشطة";
      case "bill_requested":
        return "طلب الفاتورة";
      case "payment_pending":
        return "انتظار الدفع";
      case "closed":
        return "انتهت الجلسة";
    }
  }

  switch (status) {
    case "open":
      return "Active session";
    case "bill_requested":
      return "Bill requested";
    case "payment_pending":
      return "Payment pending";
    case "closed":
      return "Session ended";
  }
}
