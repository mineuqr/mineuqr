/**
 * MULTI-CHECK-ALLOCATION-PRESENTATION-1 — display labels only.
 * No business rules or status inference beyond label lookup.
 */

export type MultiCheckAllocationLang = "ar" | "en";

export const multiCheckAllocationStatusLabels = {
  pending: { ar: "قيد الانتظار", en: "Pending" },
  reserved: { ar: "محجوز", en: "Reserved" },
  applied: { ar: "مطبق", en: "Applied" },
  adjusted: { ar: "معدّل", en: "Adjusted" },
  reversed: { ar: "معكوس", en: "Reversed" },
  completed: { ar: "مكتمل", en: "Completed" },
  cancelled: { ar: "ملغى", en: "Cancelled" },
} as const;

export type MultiCheckAllocationStatusKey =
  keyof typeof multiCheckAllocationStatusLabels;

export const multiCheckAllocationUiLabels = {
  sectionTitle: {
    ar: "توزيع الحسابات المتعددة",
    en: "Multi Check Allocation",
  },
  empty: {
    ar: "لا توجد توزيعات لهذا الحساب",
    en: "No allocations for this check",
  },
  loading: { ar: "جاري تحميل التوزيعات…", en: "Loading allocations…" },
  unauthorized: { ar: "غير مصرح", en: "Unauthorized" },
  forbidden: { ar: "غير مصرح بالوصول", en: "Forbidden" },
  notFound: { ar: "التوزيع غير موجود", en: "Allocation not found" },
  projectionUnavailable: {
    ar: "عرض التوزيع غير متاح حالياً",
    en: "Allocation projection unavailable",
  },
  conflict: {
    ar: "تعذر تنفيذ الأمر على التوزيع",
    en: "Allocation command rejected",
  },
  unexpected: {
    ar: "تعذر تحميل التوزيعات",
    en: "Unable to load allocations",
  },
  mutationUnexpected: {
    ar: "تعذر تنفيذ عملية التوزيع",
    en: "Unable to process allocation",
  },
  successApplied: { ar: "تم تطبيق الأمر", en: "Command applied" },
  successAlreadyApplied: {
    ar: "الأمر مطبق مسبقاً",
    en: "Command already applied",
  },
  successNoChange: { ar: "لا تغيير", en: "No change" },
  allocationLabel: { ar: "توزيع", en: "Allocation" },
  responsibilityTitle: {
    ar: "مسؤولية التوزيع",
    en: "Allocation responsibility",
  },
  financialResponsibility: { ar: "المسؤولية المالية", en: "Responsibility" },
  allocatedAmount: { ar: "المخصص", en: "Allocated" },
  remainingAmount: { ar: "المتبقي", en: "Remaining" },
  portionsTitle: { ar: "الأجزاء", en: "Portions" },
  adjustmentsTitle: { ar: "التعديلات", en: "Adjustments" },
  reversalsTitle: { ar: "العكس", en: "Reversals" },
  timelineTitle: { ar: "الجدول الزمني", en: "Timeline" },
  metadataTitle: { ar: "بيانات العرض", en: "Projection metadata" },
  apiContract: { ar: "عقد الواجهة", en: "API contract" },
  sourceCheck: { ar: "حساب المصدر", en: "Source check" },
  targetCheck: { ar: "حساب الهدف", en: "Target check" },
  create: { ar: "إنشاء توزيع", en: "Create allocation" },
  reserve: { ar: "حجز", en: "Reserve" },
  apply: { ar: "تطبيق", en: "Apply" },
  adjust: { ar: "تعديل", en: "Adjust" },
  reverse: { ar: "عكس", en: "Reverse" },
  complete: { ar: "إكمال", en: "Complete" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  confirm: { ar: "تأكيد", en: "Confirm" },
  dismiss: { ar: "إغلاق", en: "Close" },
  createTitle: { ar: "إنشاء توزيع جديد", en: "Create allocation" },
  adjustTitle: { ar: "تعديل التوزيع", en: "Adjust allocation" },
  reverseTitle: { ar: "عكس التوزيع", en: "Reverse allocation" },
  confirmReserve: {
    ar: "هل تريد حجز هذا التوزيع؟",
    en: "Reserve this allocation?",
  },
  confirmApply: {
    ar: "هل تريد تطبيق هذا التوزيع؟",
    en: "Apply this allocation?",
  },
  confirmComplete: {
    ar: "هل تريد إكمال هذا التوزيع؟",
    en: "Complete this allocation?",
  },
  confirmCancel: {
    ar: "هل تريد إلغاء هذا التوزيع؟",
    en: "Cancel this allocation?",
  },
  amount: { ar: "المبلغ", en: "Amount" },
  direction: { ar: "الاتجاه", en: "Direction" },
  increase: { ar: "زيادة", en: "Increase" },
  decrease: { ar: "نقصان", en: "Decrease" },
  targetCheckId: { ar: "معرّف حساب الهدف", en: "Target check ID" },
  allocationReference: { ar: "مرجع التوزيع", en: "Allocation reference" },
  notCheckSettlement: {
    ar: "إكمال التوزيع ≠ التسوية المالية للحساب",
    en: "Allocation completion ≠ check financial settlement",
  },
  appliedFlag: { ar: "مطبق", en: "Applied" },
  pendingFlag: { ar: "غير مطبق", en: "Not applied" },
} as const;

export function multiCheckAllocationStatusLabel(
  status: string,
  language: MultiCheckAllocationLang
): string {
  const key = status as MultiCheckAllocationStatusKey;
  const entry = multiCheckAllocationStatusLabels[key];
  if (!entry) return status;
  return entry[language];
}

export function multiCheckAllocationUiLabel(
  key: keyof typeof multiCheckAllocationUiLabels,
  language: MultiCheckAllocationLang
): string {
  return multiCheckAllocationUiLabels[key][language];
}
