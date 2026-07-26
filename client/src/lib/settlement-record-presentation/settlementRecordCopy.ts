/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 / REFUND-SETTLEMENT-RECORD-ADOPTION-1
 * REFUND-PRESENTATION-ADOPTION-1
 * Operator copy (ar/en). Polymorphic status labels include refunded.
 * Operational language only — no accounting / implementation terms.
 */

export type SettlementRecordLang = "ar" | "en";

export const settlementRecordUiLabels = {
  historyTitle: { ar: "سجل التسويات", en: "Settlement History" },
  detailTitle: { ar: "تفاصيل التسوية", en: "Settlement Detail" },
  receiptTitle: { ar: "إيصال العميل", en: "Customer Receipt" },
  successTitle: { ar: "تم تسجيل الدفع", en: "Payment registered" },
  successBody: {
    ar: "تم إنشاء سجل التسوية بنجاح.",
    en: "Settlement record created successfully.",
  },
  outstanding: { ar: "المبلغ المستحق", en: "Outstanding Amount" },
  paymentMethods: { ar: "طرق الدفع", en: "Payment Methods" },
  amountPaid: { ar: "المبلغ المدفوع", en: "Amount Paid" },
  remaining: { ar: "المتبقي", en: "Remaining" },
  registerPayment: { ar: "تسجيل الدفع", en: "Register Payment" },
  settlementNumber: { ar: "رقم التسوية", en: "Settlement Number" },
  settlementTime: { ar: "وقت التسوية", en: "Settlement Time" },
  source: { ar: "المصدر", en: "Source" },
  sourceType: { ar: "المصدر", en: "Source" },
  sourceNumber: { ar: "رقم المصدر", en: "Source Number" },
  grandTotal: { ar: "الإجمالي", en: "Total" },
  paymentStatus: { ar: "الحالة", en: "Status" },
  paymentMethodSummary: { ar: "طريقة الدفع", en: "Payment Method" },
  settlementStatus: { ar: "الحالة", en: "Status" },
  status: { ar: "الحالة", en: "Status" },
  filterSource: { ar: "المصدر", en: "Source" },
  allSources: { ar: "كل المصادر", en: "All sources" },
  quickToday: { ar: "اليوم", en: "Today" },
  quick7d: { ar: "٧ أيام", en: "7 Days" },
  quick30d: { ar: "٣٠ يومًا", en: "30 Days" },
  quick90d: { ar: "٩٠ يومًا", en: "90 Days" },
  viewAction: { ar: "عرض", en: "View" },
  receiptAction: { ar: "إيصال", en: "Receipt" },
  orders: { ar: "الطلبات", en: "Orders" },
  checks: { ar: "الفاتورة", en: "Checks" },
  items: { ar: "الأصناف", en: "Items" },
  financial: { ar: "الملخص المالي", en: "Financial Snapshot" },
  tax: { ar: "الضريبة", en: "Tax Snapshot" },
  payments: { ar: "المدفوعات", en: "Payment Methods" },
  operator: { ar: "المشغّل", en: "Operator" },
  audit: { ar: "الطوابع الزمنية", en: "Audit timestamps" },
  subtotal: { ar: "المجموع الفرعي", en: "Subtotal" },
  discount: { ar: "الخصم", en: "Discount" },
  taxAmount: { ar: "الضريبة", en: "Tax" },
  search: { ar: "بحث", en: "Search" },
  dateFrom: { ar: "من تاريخ", en: "From" },
  dateTo: { ar: "إلى تاريخ", en: "To" },
  filterStatus: { ar: "الحالة", en: "Status" },
  allStatuses: { ar: "الكل", en: "All" },
  loading: { ar: "جاري التحميل…", en: "Loading…" },
  empty: { ar: "لا توجد تسويات بعد.", en: "No settlements yet." },
  error: { ar: "تعذر تحميل التسويات.", en: "Could not load settlements." },
  viewDetail: { ar: "التفاصيل", en: "Settlement Detail" },
  viewReceipt: { ar: "الإيصال", en: "Customer Receipt" },
  viewHistory: { ar: "سجل التسويات", en: "Settlement History" },
  completedOrders: { ar: "الطلبات المكتملة", en: "Completed Orders" },
  printReceipt: { ar: "طباعة", en: "Print" },
  close: { ar: "إغلاق", en: "Close" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  previous: { ar: "السابق", en: "Previous" },
  next: { ar: "التالي", en: "Next" },
  pageOf: { ar: "صفحة", en: "Page" },
  sessionSource: { ar: "جلسة", en: "Session" },
  checkSource: { ar: "فاتورة", en: "Check" },
  settled: { ar: "مسوّى", en: "Settled" },
  paid: { ar: "مدفوع", en: "Paid" },
  complimentary: { ar: "ضيافة", en: "Complimentary" },
  voided: { ar: "ملغى", en: "Voided" },
  refunded: { ar: "مُسترد", en: "Refunded" },
  reversed: { ar: "معكوس", en: "Reversed" },
  corrected: { ar: "مصحّح", en: "Corrected" },
  settlementComplete: { ar: "اكتملت التسوية", en: "Settlement complete" },
  refundPublished: { ar: "تم تسجيل المرتجع", en: "Refund published" },
  readOnly: { ar: "عرض فقط", en: "Read-only" },
  generation: { ar: "الجيل", en: "Generation" },
  businessDay: { ar: "يوم العمل", en: "Business Day" },
  priorSettlement: { ar: "التسوية السابقة", en: "Prior Settlement" },
  compensatingChain: { ar: "سلسلة التسوية", en: "Settlement Chain" },
  kindSettlement: { ar: "تسوية", en: "Settlement" },
  kindRefund: { ar: "مرتجع", en: "Refund" },
  kindVoid: { ar: "إلغاء", en: "Void" },
  kindReversal: { ar: "عكس", en: "Reversal" },
  kindCorrection: { ar: "تصحيح", en: "Correction" },
  register: { ar: "الصندوق", en: "Register" },
  financialShift: { ar: "الوردية", en: "Shift" },
  attributionMissing: {
    ar: "غير منسوب",
    en: "Not attributed",
  },
  createdAt: { ar: "وقت الإنشاء", en: "Created" },
  settledAt: { ar: "وقت التسوية", en: "Settled" },
  openPrior: { ar: "فتح التسوية السابقة", en: "Open prior settlement" },
  paymentStatusCaptured: { ar: "مقبوض", en: "Captured" },
  paymentStatusRefunded: { ar: "مُسترد", en: "Refunded" },
  operatorStaff: { ar: "مشغّل", en: "Staff" },
  operatorSystem: { ar: "النظام", en: "System" },
  refundAction: { ar: "استرداد", en: "Refund" },
  refundConfirmTitle: { ar: "تأكيد الاسترداد", en: "Confirm Refund" },
  refundConfirmBody: {
    ar: "سيتم تسجيل مرتجع عبر سجل التسوية. لا يمكن التراجع عن المنشور المالي.",
    en: "A refund publication will be recorded in Settlement History. The financial publication cannot be undone.",
  },
  refundableBalance: {
    ar: "الرصيد القابل للاسترداد",
    en: "Refundable Balance",
  },
  refundAmount: { ar: "مبلغ الاسترداد", en: "Refund Amount" },
  refundReason: { ar: "السبب (اختياري)", en: "Reason (optional)" },
  refundTender: { ar: "طريقة الاسترداد", en: "Refund Method" },
  refundConfirmAction: { ar: "تأكيد الاسترداد", en: "Confirm Refund" },
  refundSuccess: {
    ar: "تم تسجيل المرتجع بنجاح.",
    en: "Refund published successfully.",
  },
  refundErrorBudget: {
    ar: "رصيد الاسترداد مستنفد.",
    en: "Refund budget exhausted.",
  },
  refundErrorAlready: {
    ar: "تم استرداد هذا المبلغ مسبقاً.",
    en: "Already refunded.",
  },
  refundErrorNotRefundable: {
    ar: "هذه التسوية غير قابلة للاسترداد.",
    en: "Settlement is not refundable.",
  },
  refundErrorPermission: {
    ar: "لا تملك صلاحية تنفيذ الاسترداد.",
    en: "Permission denied for refund.",
  },
  refundErrorAmount: {
    ar: "مبلغ الاسترداد غير صالح.",
    en: "Invalid refund amount.",
  },
  refundErrorConflict: {
    ar: "تعارض أثناء تسجيل المرتجع. حاول مرة أخرى.",
    en: "Refund conflict. Please try again.",
  },
  refundErrorGeneric: {
    ar: "تعذر تنفيذ الاسترداد.",
    en: "Could not execute refund.",
  },
} as const;

export type SettlementRecordUiKey = keyof typeof settlementRecordUiLabels;

export function settlementRecordUiLabel(
  key: SettlementRecordUiKey,
  language: SettlementRecordLang
): string {
  return settlementRecordUiLabels[key][language];
}

export function settlementStatusLabel(
  status: string,
  language: SettlementRecordLang
): string {
  if (status === "complimentary") {
    return settlementRecordUiLabel("complimentary", language);
  }
  if (status === "voided") return settlementRecordUiLabel("voided", language);
  if (status === "paid") return settlementRecordUiLabel("paid", language);
  if (status === "refunded") return settlementRecordUiLabel("refunded", language);
  if (status === "reversed") return settlementRecordUiLabel("reversed", language);
  if (status === "corrected") {
    return settlementRecordUiLabel("corrected", language);
  }
  return settlementRecordUiLabel("settled", language);
}

export function settlementPaymentStatusLabel(
  status: string,
  language: SettlementRecordLang
): string {
  if (status === "refunded") {
    return settlementRecordUiLabel("paymentStatusRefunded", language);
  }
  if (
    status === "captured" ||
    status === "applied" ||
    status === "succeeded" ||
    status === "paid"
  ) {
    return settlementRecordUiLabel("paymentStatusCaptured", language);
  }
  return status;
}
