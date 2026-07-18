/**
 * REPORTING-PRODUCT-SEMANTICS-1 — canonical user-facing KPI terminology.
 *
 * Governs presentation labels only. Does not change KPI IDs, formulas,
 * DTO fields, or Reporting APIs.
 *
 * KPI Governance defines WHAT is measured.
 * Product Semantics defines HOW it is named for restaurant users.
 */

import type { KpiId } from "./kpiDictionary";
import { getKpiDefinition } from "./kpiDictionary";

export const PRODUCT_SEMANTICS_PROGRAM_ID =
  "REPORTING-PRODUCT-SEMANTICS-1" as const;

export type PresentationLanguage = "en" | "ar";

/**
 * Preferred restaurant-facing labels.
 * English aligns with KPI_DICTIONARY.name after PRODUCT-SEMANTICS adoption.
 */
export const PREFERRED_KPI_LABELS: Readonly<
  Record<KpiId, Readonly<{ en: string; ar: string }>>
> = Object.freeze({
  revenue: { en: "Check Revenue", ar: "إيرادات الشيكات" },
  paidCheckCount: { en: "Paid Checks", ar: "الشيكات المدفوعة" },
  taxCollected: { en: "Tax Collected", ar: "الضريبة المحصّلة" },
  averageCheck: { en: "Average Check", ar: "متوسط الشيك" },
  complimentaryCount: { en: "Complimentary Checks", ar: "الشيكات المجانية" },
  complimentaryAmount: {
    en: "Complimentary Amount",
    ar: "قيمة الشيكات المجانية",
  },
  voidedCount: { en: "Voided Checks", ar: "الشيكات الملغاة" },
  dailySales: { en: "Daily Check Revenue", ar: "إيرادات الشيكات اليومية" },
  orderSales: { en: "Order Sales", ar: "مبيعات الطلبات" },
  completedOrders: { en: "Completed Orders", ar: "الطلبات المكتملة" },
  averageOrder: { en: "Average Order", ar: "متوسط الطلب" },
  orderCount: { en: "Orders", ar: "عدد الطلبات" },
  topSellingItems: { en: "Top Selling Items", ar: "الأصناف الأكثر مبيعاً" },
  activeSessions: { en: "Active Sessions", ar: "الجلسات النشطة" },
  occupiedTables: { en: "Occupied Tables", ar: "الطاولات المشغولة" },
  pendingOrders: { en: "Pending Orders", ar: "الطلبات المعلقة" },
  activeOrders: { en: "Active Orders", ar: "الطلبات النشطة" },
  kitchenLoad: { en: "Kitchen Load", ar: "حمل المطبخ" },
  catalogCategoryCount: { en: "Categories", ar: "التصنيفات" },
  catalogItemCount: { en: "Menu Items", ar: "الأصناف" },
  menuVisits: { en: "Menu Visits", ar: "زيارات القائمة" },
});

/**
 * Labels that must not be used as synonyms for Check Revenue or Order Sales.
 * Presentation must not reintroduce these as primary KPI names.
 */
export const DEPRECATED_PRESENTATION_LABELS = Object.freeze({
  /** Must not replace Check Revenue */
  forCheckRevenue: [
    "Revenue",
    "Paid Revenue",
    "Settlement",
    "Settlement Revenue",
    "Gross Sales",
    "Sales",
    "Net Revenue",
    "الإيرادات",
    "المبيعات",
  ],
  /** Must not replace Order Sales */
  forOrderSales: [
    "Revenue",
    "Check Revenue",
    "Gross Sales",
    "Paid Revenue",
    "Settlement",
  ],
} as const);

export const SEMANTIC_CLARIFICATIONS = Object.freeze({
  en: {
    checkRevenue:
      "Check Revenue = sum of paid Check totals (not Order Sales).",
    orderSales:
      "Order Sales = completed (served) order totals from Order Read (not Check Revenue).",
    averagePair:
      "Average Check uses Check Revenue; Average Order uses Order Sales.",
  },
  ar: {
    checkRevenue:
      "إيرادات الشيكات = مجموع قيم الشيكات المدفوعة (وليست مبيعات الطلبات).",
    orderSales:
      "مبيعات الطلبات = مجموع الطلبات المكتملة من قراءة الطلبات (وليست إيرادات الشيكات).",
    averagePair:
      "متوسط الشيك من إيرادات الشيكات؛ متوسط الطلب من مبيعات الطلبات.",
  },
} as const);

/** Preferred label for a KPI id. Falls back to registry name. */
export function preferredKpiLabel(
  id: KpiId,
  language: PresentationLanguage
): string {
  const entry = PREFERRED_KPI_LABELS[id];
  if (entry) return entry[language];
  return getKpiDefinition(id).name;
}

/** Section titles that pair Check Revenue vs Order Sales domains. */
export const SECTION_TERMINOLOGY = Object.freeze({
  en: {
    checkRevenueAnalytics: "Check Revenue Analytics",
    checkRevenueOverview: "Check Revenue Overview",
    checkRevenueTrends: "Check Revenue Trends",
    orderSalesAnalytics: "Order Sales",
    financialPerformance: "Check Revenue Detail",
    orderSalesPerformance: "Order Sales Detail",
    /** REPORTING-EXECUTIVE-SUMMARY-RATIONALIZATION-1 */
    executiveSnapshot: "At a Glance",
    /** REPORTING-EXECUTIVE-SUMMARY-SIMPLIFICATION-1 — operational focus */
    executiveSnapshotHint:
      "Operational performance this period — Check Revenue and tax are in Financial Summary.",
    taxAnalysis: "Tax",
    /** Clarifies Tax Collected covers the full report period (presentation only). */
    taxAnalysisPeriodNote:
      "Tax Collected is the total tax from all paid checks in this reporting period (not a subset of sections).",
    adjustmentsAnalysis: "Adjustments",
    financialSummary: "Financial Summary",
    executiveSummary: "Executive Summary",
    coverSubtitle: "Business performance overview",
    moneyCollected: "Money Collected",
    moneyCollectedHint:
      "Paid guest checks for this reporting period — Check Revenue story.",
    /** REPORTING-PAYMENT-METHOD-ANALYTICS-1 */
    paymentMethodAnalysis: "Payment Method Analysis",
    paymentMix: "Payment Mix",
    tenderAmount: "Tender Amount",
    mixPercent: "Mix %",
    checksByMethod: "Paid Checks (by method)",
    averageCheckByMethod: "Average Check (by method)",
    monetaryTenderTotal: "Monetary Tender Total",
    paymentAnalyticsNote:
      "Payment mix is from settlement tenders. Check Revenue remains the official revenue total from paid checks.",
    paymentMethod: "Payment Method",
    transactions: "Transactions",
  },
  ar: {
    checkRevenueAnalytics: "تحليلات إيرادات الشيكات",
    checkRevenueOverview: "نظرة إيرادات الشيكات",
    checkRevenueTrends: "اتجاهات إيرادات الشيكات",
    orderSalesAnalytics: "مبيعات الطلبات",
    financialPerformance: "تفاصيل إيرادات الشيكات",
    orderSalesPerformance: "تفاصيل مبيعات الطلبات",
    executiveSnapshot: "لمحة سريعة",
    executiveSnapshotHint:
      "الأداء التشغيلي لهذه الفترة — إيرادات الشيكات والضريبة في الملخص المالي.",
    taxAnalysis: "الضريبة",
    taxAnalysisPeriodNote:
      "الضريبة المحصّلة هي إجمالي الضريبة من جميع الشيكات المدفوعة في فترة التقرير كاملة (وليست جزءاً من أقسام محددة).",
    adjustmentsAnalysis: "التسويات",
    financialSummary: "الملخص المالي",
    executiveSummary: "الملخص التنفيذي",
    coverSubtitle: "نظرة على أداء العمل",
    moneyCollected: "الأموال المحصّلة",
    moneyCollectedHint:
      "شيكات الضيوف المدفوعة لهذه الفترة — قصة إيرادات الشيكات.",
    paymentMethodAnalysis: "تحليل طرق الدفع",
    paymentMix: "مزيج الدفع",
    tenderAmount: "مبلغ وسيلة الدفع",
    mixPercent: "نسبة المزيج %",
    checksByMethod: "الشيكات المدفوعة (حسب الطريقة)",
    averageCheckByMethod: "متوسط الشيك (حسب الطريقة)",
    monetaryTenderTotal: "إجمالي مبالغ وسائل الدفع",
    paymentAnalyticsNote:
      "مزيج الدفع من معاملات التسوية. إيرادات الشيكات تبقى الإجمالي الرسمي من الشيكات المدفوعة.",
    paymentMethod: "طريقة الدفع",
    transactions: "المعاملات",
  },
} as const);

/** Payment method display labels (Settlement Transaction codes). */
export const PAYMENT_METHOD_LABELS = Object.freeze({
  cash: { en: "Cash", ar: "نقداً" },
  mada: { en: "Mada", ar: "مدى" },
  visa: { en: "Visa", ar: "فيزا" },
  mastercard: { en: "Mastercard", ar: "ماستركارد" },
  apple_pay: { en: "Apple Pay", ar: "Apple Pay" },
  stc_pay: { en: "STC Pay", ar: "STC Pay" },
  bank_transfer: { en: "Bank Transfer", ar: "تحويل بنكي" },
  complimentary: { en: "Complimentary", ar: "مجاني" },
  other: { en: "Other", ar: "أخرى" },
} as const);

export type PaymentMethodLabelCode = keyof typeof PAYMENT_METHOD_LABELS;

export function preferredPaymentMethodLabel(
  method: string,
  language: PresentationLanguage
): string {
  const entry =
    PAYMENT_METHOD_LABELS[method as PaymentMethodLabelCode];
  if (entry) return entry[language];
  return method;
}

/**
 * KPI ids allowed on the Executive Summary (operational snapshot).
 * REPORTING-EXECUTIVE-SUMMARY-SIMPLIFICATION-1 — Money Collected KPIs
 * (Check Revenue, Paid Checks, Average Check) live on Financial Summary only.
 * Tax / complimentary / voided remain Financial Summary analysis.
 */
export const EXECUTIVE_SUMMARY_KPI_IDS = [
  "orderSales",
  "orderCount",
  "averageOrder",
] as const satisfies readonly KpiId[];

export type ExecutiveSummaryKpiId = (typeof EXECUTIVE_SUMMARY_KPI_IDS)[number];
