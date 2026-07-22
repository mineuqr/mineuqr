/**
 * ORDER-SETTLEMENT-PRESENTATION-ADOPTION-1 — display labels only.
 * No business rules or status inference.
 */

export type OrderSettlementLang = "ar" | "en";

export const orderSettlementStatusLabels = {
  pending: { ar: "قيد الانتظار", en: "Pending" },
  partially_settled: { ar: "مسوّى جزئياً", en: "Partially Settled" },
  settled: { ar: "مسوّى", en: "Settled" },
  complimentary: { ar: "ضيافة", en: "Complimentary" },
  cancelled: { ar: "ملغى", en: "Cancelled" },
  voided: { ar: "ملغى مالياً", en: "Voided" },
  refunded: { ar: "مسترد", en: "Refunded" },
} as const;

export type OrderSettlementStatusKey = keyof typeof orderSettlementStatusLabels;

export const orderSettlementUiLabels = {
  sectionTitle: { ar: "تسوية الطلبات", en: "Order Settlement" },
  empty: {
    ar: "لا توجد سجلات تسوية للطلبات",
    en: "No order settlement records",
  },
  loading: { ar: "جاري تحميل التسوية…", en: "Loading settlement…" },
  unauthorized: { ar: "غير مصرح", en: "Unauthorized" },
  forbidden: { ar: "غير مصرح بالوصول", en: "Forbidden" },
  notFound: { ar: "التسوية غير موجودة", en: "Settlement not found" },
  projectionUnavailable: {
    ar: "عرض التسوية غير متاح حالياً",
    en: "Settlement projection unavailable",
  },
  unexpected: { ar: "تعذر تحميل التسوية", en: "Unable to load settlement" },
  orderLabel: { ar: "طلب", en: "Order" },
  settledAmount: { ar: "المبلغ المسوّى", en: "Settled amount" },
  outstandingAmount: { ar: "المتبقي", en: "Outstanding" },
  summaryTitle: { ar: "ملخص التسوية", en: "Settlement summary" },
  totalOrders: { ar: "الطلبات", en: "Orders" },
  diagnostics: { ar: "بيانات العرض", en: "Projection metadata" },
} as const;

export function orderSettlementStatusLabel(
  status: string,
  language: OrderSettlementLang
): string {
  const key = status as OrderSettlementStatusKey;
  const entry = orderSettlementStatusLabels[key];
  if (!entry) return status;
  return entry[language];
}

export function orderSettlementUiLabel(
  key: keyof typeof orderSettlementUiLabels,
  language: OrderSettlementLang
): string {
  return orderSettlementUiLabels[key][language];
}
