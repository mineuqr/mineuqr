/**
 * TABLE-MANAGEMENT-1 UX-1D — session workspace action copy.
 * SETTLEMENT-ARCHITECTURE-1A — settlement actions.
 */

type Lang = "ar" | "en";

export const sessionActionLabels = {
  markPaid: { ar: "تسجيل الدفع", en: "Register Payment" },
  markComplimentary: { ar: "ضيافة", en: "Mark Complimentary" },
  closeSession: { ar: "إغلاق الجلسة", en: "Close Session" },
  closeConfirmTitle: { ar: "إغلاق الجلسة؟", en: "Close session?" },
  closeConfirmBody: {
    ar: "سيؤدي إغلاق الجلسة إلى تحرير الطاولة، وسيحتاج العملاء إلى بدء جلسة جديدة للطلب مجدداً.",
    en: "Closing the session will free the table and customers must start a new session to order again.",
  },
  paidConfirmTitle: { ar: "تسجيل الدفع؟", en: "Register payment?" },
  paidConfirmBody: {
    ar: "اختر طريقة الدفع. سيتم تسوية الجلسة وإغلاقها تلقائياً وتحرير الطاولة.",
    en: "Select a payment method. The session will be settled and closed automatically, freeing the table.",
  },
  selectPaymentMethod: {
    ar: "طرق الدفع",
    en: "Payment Methods",
  },
  complimentaryConfirmTitle: { ar: "تسجيل ضيافة؟", en: "Mark complimentary?" },
  complimentaryConfirmBody: {
    ar: "سيتم تسوية الجلسة كضيافة وإغلاقها تلقائياً.",
    en: "The session will be settled as complimentary and closed automatically.",
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
