/**
 * SPLIT-PAYMENT-PRESENTATION-ADOPTION-1 — display labels only.
 * No business rules or status inference.
 */

export type SplitPaymentLang = "ar" | "en";

export const splitPaymentStatusLabels = {
  pending: { ar: "قيد الانتظار", en: "Pending" },
  authorized: { ar: "مصرّح", en: "Authorized" },
  captured: { ar: "محصّل", en: "Captured" },
  partially_applied: { ar: "مطبق جزئياً", en: "Partially Applied" },
  applied: { ar: "مطبق", en: "Applied" },
  cancelled: { ar: "ملغى", en: "Cancelled" },
  voided: { ar: "ملغى مالياً", en: "Voided" },
  refunded: { ar: "مسترد", en: "Refunded" },
  failed: { ar: "فشل", en: "Failed" },
} as const;

export type SplitPaymentStatusKey = keyof typeof splitPaymentStatusLabels;

export const splitPaymentAttemptStatusLabels = {
  started: { ar: "بدأ", en: "Started" },
  succeeded: { ar: "نجح", en: "Succeeded" },
  failed: { ar: "فشل", en: "Failed" },
  cancelled: { ar: "ملغى", en: "Cancelled" },
} as const;

export type SplitPaymentAttemptStatusKey =
  keyof typeof splitPaymentAttemptStatusLabels;

export const splitPaymentUiLabels = {
  sectionTitle: { ar: "المدفوعات المقسّمة", en: "Split Payments" },
  empty: {
    ar: "لا توجد مدفوعات مقسّمة لهذا الحساب",
    en: "No split payments for this check",
  },
  loading: { ar: "جاري تحميل المدفوعات…", en: "Loading payments…" },
  unauthorized: { ar: "غير مصرح", en: "Unauthorized" },
  forbidden: { ar: "غير مصرح بالوصول", en: "Forbidden" },
  notFound: { ar: "الدفعة غير موجودة", en: "Payment not found" },
  projectionUnavailable: {
    ar: "عرض المدفوعات غير متاح حالياً",
    en: "Payment projection unavailable",
  },
  unexpected: { ar: "تعذر تحميل المدفوعات", en: "Unable to load payments" },
  paymentLabel: { ar: "دفعة", en: "Payment" },
  amount: { ar: "المبلغ", en: "Amount" },
  allocatedAmount: { ar: "المخصص", en: "Allocated" },
  unallocatedAmount: { ar: "غير المخصص", en: "Unallocated" },
  outstandingTitle: { ar: "المتبقي على الحساب", en: "Check outstanding" },
  financialResponsibility: { ar: "المسؤولية المالية", en: "Responsibility" },
  appliedPaymentValue: { ar: "قيمة المدفوعات المطبقة", en: "Applied value" },
  outstandingBalance: { ar: "الرصيد المتبقي", en: "Outstanding balance" },
  summaryTitle: { ar: "ملخص المدفوعات", en: "Payment summary" },
  totalPayments: { ar: "المدفوعات", en: "Payments" },
  tendersTitle: { ar: "وسائل الدفع", en: "Tenders" },
  allocationsTitle: { ar: "التخصيصات", en: "Allocations" },
  timelineTitle: { ar: "الجدول الزمني", en: "Timeline" },
  attemptsTitle: { ar: "محاولات الدفع", en: "Payment attempts" },
  orderLabel: { ar: "طلب", en: "Order" },
  diagnostics: { ar: "بيانات العرض", en: "Projection metadata" },
  apiContract: { ar: "عقد الواجهة", en: "API contract" },
  notFinancialSettlement: {
    ar: "إتمام الدفع ≠ التسوية المالية للحساب",
    en: "Payment completion ≠ check financial settlement",
  },
} as const;

export function splitPaymentStatusLabel(
  status: string,
  language: SplitPaymentLang
): string {
  const key = status as SplitPaymentStatusKey;
  const entry = splitPaymentStatusLabels[key];
  if (!entry) return status;
  return entry[language];
}

export function splitPaymentAttemptStatusLabel(
  status: string,
  language: SplitPaymentLang
): string {
  const key = status as SplitPaymentAttemptStatusKey;
  const entry = splitPaymentAttemptStatusLabels[key];
  if (!entry) return status;
  return entry[language];
}

export function splitPaymentUiLabel(
  key: keyof typeof splitPaymentUiLabels,
  language: SplitPaymentLang
): string {
  return splitPaymentUiLabels[key][language];
}
