/**
 * TABLE-MANAGEMENT-1 D4 — dining session banner copy.
 * SETTLEMENT-ARCHITECTURE-1A — settlement lifecycle statuses.
 */

export type DiningSessionStatus =
  | "open"
  | "paid"
  | "complimentary"
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
      case "paid":
        return ["تم تسوية الجلسة.", "انتهت جلسة الطاولة."];
      case "complimentary":
        return ["جلسة ضيافة.", "انتهت جلسة الطاولة."];
      case "closed":
        return ["انتهت جلسة الطاولة.", "للطلب مجدداً يرجى مسح رمز الطاولة عند بدء جلسة جديدة."];
    }
  }

  switch (status) {
    case "open":
      return ["Your table session is active.", "You can place additional orders."];
    case "paid":
      return ["Session settled.", "This table session has ended."];
    case "complimentary":
      return ["Complimentary session.", "This table session has ended."];
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
      case "paid":
        return "تمت التسوية";
      case "complimentary":
        return "ضيافة";
      case "closed":
        return "انتهت الجلسة";
    }
  }

  switch (status) {
    case "open":
      return "Active session";
    case "paid":
      return "Settled";
    case "complimentary":
      return "Complimentary";
    case "closed":
      return "Session ended";
  }
}
