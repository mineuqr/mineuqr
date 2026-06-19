/**
 * TABLE-MANAGEMENT-1 UX-1D — session workspace action copy.
 */

type Lang = "ar" | "en";

export const sessionActionLabels = {
  requestBill: { ar: "طلب الفاتورة", en: "Request Bill" },
  cancelBillRequest: { ar: "إلغاء طلب الفاتورة", en: "Cancel Request" },
  markPaymentPending: { ar: "الدفع قيد المعالجة", en: "Payment Pending" },
  closeSession: { ar: "إغلاق الجلسة", en: "Close Session" },
  closeConfirmTitle: { ar: "إغلاق الجلسة؟", en: "Close session?" },
  closeConfirmBody: {
    ar: "سيؤدي إغلاق الجلسة إلى تحرير الطاولة، وسيحتاج العملاء إلى بدء جلسة جديدة للطلب مجدداً.",
    en: "Closing the session will free the table and customers must start a new session to order again.",
  },
  cancelConfirmTitle: { ar: "إلغاء طلب الفاتورة؟", en: "Cancel bill request?" },
  cancelConfirmBody: {
    ar: "سيتمكن العملاء من إضافة طلبات جديدة مرة أخرى.",
    en: "Customers will be able to place new orders again.",
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
