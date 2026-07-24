/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 — operator copy (ar/en).
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
  sourceType: { ar: "المصدر", en: "Source Type" },
  sourceNumber: { ar: "رقم المصدر", en: "Source Number" },
  grandTotal: { ar: "الإجمالي", en: "Grand Total" },
  paymentStatus: { ar: "حالة الدفع", en: "Payment Status" },
  paymentMethodSummary: { ar: "طرق الدفع", en: "Payment Method Summary" },
  settlementStatus: { ar: "حالة التسوية", en: "Settlement Status" },
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
  settlementComplete: { ar: "اكتملت التسوية", en: "Settlement complete" },
  readOnly: { ar: "عرض فقط", en: "Read-only" },
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
  if (status === "complimentary") return settlementRecordUiLabel("complimentary", language);
  if (status === "voided") return settlementRecordUiLabel("voided", language);
  if (status === "paid") return settlementRecordUiLabel("paid", language);
  return settlementRecordUiLabel("settled", language);
}
