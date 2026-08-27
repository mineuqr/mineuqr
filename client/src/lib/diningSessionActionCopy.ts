/**
 * TABLE-MANAGEMENT-1 UX-1D — session workspace action copy.
 * SETTLEMENT-ARCHITECTURE-1A — settlement actions.
 */

type Lang = "ar" | "en";

export const sessionActionLabels = {
  markPaid: { ar: "تسجيل الدفع", en: "Register Payment" },
  sendToCashier: { ar: "إرسال للكاشير", en: "Send to Cashier" },
  markComplimentary: { ar: "ضيافة", en: "Mark Complimentary" },
  closeSession: { ar: "إغلاق الجلسة", en: "Close Session" },
  closeConfirmTitle: { ar: "إغلاق الجلسة؟", en: "Close session?" },
  closeConfirmBody: {
    ar: "لا يمكن إغلاق الجلسة قبل دفع الكاشير. بعد الدفع يمكن إغلاق الجلسة يدوياً لتحرير الطاولة.",
    en: "The session can close only after Cashier payment. After payment, close the session manually to free the table.",
  },
  paidConfirmTitle: { ar: "تسجيل الدفع؟", en: "Register payment?" },
  paidConfirmBody: {
    ar: "ادفع من الكاشير. الجلسة لا تُغلق تلقائياً بعد الدفع.",
    en: "Pay at Cashier. The session does not close automatically after payment.",
  },
  selectPaymentMethod: {
    ar: "طرق الدفع",
    en: "Payment Methods",
  },
  complimentaryConfirmTitle: { ar: "تسجيل ضيافة؟", en: "Mark complimentary?" },
  complimentaryConfirmBody: {
    ar: "الضيافة تُؤكَّد من الكاشير. لا تُغلق الجلسة تلقائياً.",
    en: "Complimentary is confirmed at Cashier. The session does not close automatically.",
  },
  actionError: { ar: "تعذر تنفيذ الإجراء", en: "Could not complete action" },
} as const;

export function sessionActionLabel(
  key: keyof typeof sessionActionLabels,
  language: Lang
): string {
  const entry = sessionActionLabels[key];
  return typeof entry === "string" ? entry : entry[language];
}
