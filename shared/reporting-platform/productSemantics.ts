/**
 * REPORTING-PRODUCT-SEMANTICS-1 — canonical user-facing KPI terminology.
 *
 * Governs presentation labels only. Does not change KPI IDs, formulas,
 * DTO fields, or Reporting APIs.
 *
 * KPI Governance defines WHAT is measured.
 * Product Semantics defines HOW it is named for restaurant users.
 */

import { toCanonicalPaymentMethod } from "../operational-session/check/paymentMethod";
import type { KpiId } from "./kpiDictionary";
import { getKpiDefinition } from "./kpiDictionary";

export const PRODUCT_SEMANTICS_PROGRAM_ID =
  "REPORTING-PRODUCT-SEMANTICS-1" as const;

export type PresentationLanguage = "en" | "ar";

/**
 * Preferred restaurant-facing labels.
 * REPORTING-UX-RATIONALIZATION-1 Rev 2.0 — Gross Sales / Net Sales / Refund Amount.
 * KPI ids and formulas unchanged.
 */
export const PREFERRED_KPI_LABELS: Readonly<
  Record<KpiId, Readonly<{ en: string; ar: string }>>
> = Object.freeze({
  revenue: { en: "Gross Sales", ar: "إجمالي المبيعات" },
  refundPublishedTotal: {
    en: "Refund Amount",
    ar: "مبلغ المرتجعات",
  },
  refundPublicationCount: { en: "Refund Count", ar: "عدد المرتجعات" },
  netRevenue: { en: "Net Sales", ar: "صافي المبيعات" },
  refundRate: { en: "Refund Rate", ar: "معدل المرتجعات" },
  paidCheckCount: { en: "Paid Checks", ar: "الشيكات المدفوعة" },
  taxCollected: { en: "Tax Collected", ar: "الضريبة المحصّلة" },
  averageCheck: { en: "Average Check", ar: "متوسط الشيك" },
  complimentaryCount: { en: "Complimentary Checks", ar: "الشيكات المجانية" },
  complimentaryAmount: {
    en: "Complimentary Amount",
    ar: "قيمة الشيكات المجانية",
  },
  voidedCount: { en: "Voided Checks", ar: "الشيكات الملغاة" },
  dailySales: { en: "Daily Gross Sales", ar: "إجمالي المبيعات اليومية" },
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
 * Labels that must not be used as synonyms for Gross Sales or Order Sales.
 * Presentation must not reintroduce these as primary KPI names.
 */
export const DEPRECATED_PRESENTATION_LABELS = Object.freeze({
  /** Must not replace Gross Sales (KPI id: revenue) */
  forCheckRevenue: [
    "Revenue",
    "Paid Revenue",
    "Settlement",
    "Settlement Revenue",
    "Sales",
    "Check Revenue",
    "الإيرادات",
    "المبيعات",
  ],
  /** Must not replace Order Sales */
  forOrderSales: [
    "Revenue",
    "Gross Sales",
    "Net Sales",
    "Paid Revenue",
    "Settlement",
    "Check Revenue",
  ],
} as const);

export const SEMANTIC_CLARIFICATIONS = Object.freeze({
  en: {
    checkRevenue:
      "Gross Sales = sum of paid Check totals (not Order Sales).",
    orderSales:
      "Order Sales = completed (served) order totals from Order Read (not Gross Sales).",
    averagePair:
      "Average Check uses Gross Sales; Average Order uses Order Sales.",
    orderSalesPopulation:
      "Order Sales, Completed Orders, and Average Order share the completed (served) population. Orders (orderCount) counts every order placed.",
  },
  ar: {
    checkRevenue:
      "إجمالي المبيعات = مجموع قيم الشيكات المدفوعة (وليست مبيعات الطلبات).",
    orderSales:
      "مبيعات الطلبات = مجموع الطلبات المكتملة من قراءة الطلبات (وليست إجمالي المبيعات).",
    averagePair:
      "متوسط الشيك من إجمالي المبيعات؛ متوسط الطلب من مبيعات الطلبات.",
    orderSalesPopulation:
      "مبيعات الطلبات والطلبات المكتملة ومتوسط الطلب تشترك في مجموعة الطلبات المكتملة (المقدَّمة). عدد الطلبات يحسب كل الطلبات المسجّلة.",
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

/** Section titles that pair Gross Sales vs Order Sales domains. */
export const SECTION_TERMINOLOGY = Object.freeze({
  en: {
    checkRevenueAnalytics: "Gross Sales Analytics",
    checkRevenueOverview: "Financial Performance",
    checkRevenueTrends: "Sales Trends",
    orderSalesAnalytics: "Order Sales",
    orderSalesAnalyticsNote:
      "Completed (served) orders — comparable with Order Sales. Not every order placed.",
    financialPerformance: "Financial Performance",
    orderSalesPerformance: "Order Sales Detail",
    executiveSnapshot: "Executive KPIs",
    executiveSnapshotHint:
      "Period executive snapshot — Gross Sales, Net Sales, refunds, tax, and order averages.",
    taxAnalysis: "Tax",
    taxAnalysisPeriodNote:
      "Tax Collected covers the full reporting period — total tax from all paid checks in range (not a subset of sections).",
    adjustmentsAnalysis: "Adjustments",
    financialSummary: "Financial Summary",
    executiveSummary: "Executive Summary",
    coverSubtitle: "Business performance overview",
    moneyCollected: "Money Collected",
    moneyCollectedHint:
      "Paid guest checks for this reporting period — Gross Sales. Net Sales subtracts Refund Amount.",
    paymentMethodAnalysis: "Payment Analytics",
    paymentMix: "Payment Mix",
    tenderAmount: "Tender Amount",
    mixPercent: "Mix %",
    checksByMethod: "Paid Checks (by method)",
    averageCheckByMethod: "Average Check (by method)",
    monetaryTenderTotal: "Monetary Tender Total",
    refundTenderTotal: "Refund Tender Total",
    refundPaymentMix: "Refund by Payment Method",
    paymentAnalyticsNote:
      "Payment mix is from settlement tenders. Gross Sales remains from paid checks; refund tenders are listed separately and do not replace Gross Sales.",
    paymentMethod: "Payment Method",
    transactions: "Transactions",
    paymentAnalyticsEmpty:
      "No settlement tenders for the reporting period.",
    paymentAnalyticsLoadError:
      "Could not load payment method analysis. Please try again.",
    refundAnalytics: "Refund Analytics",
    refundAnalyticsNote:
      "Refund publications for this period. Net Sales = Gross Sales − Refund Amount.",
    refundByOperatorPlaceholder: "Refund by Operator — coming soon (custody attribution)",
    refundByRegisterPlaceholder: "Refund by Register — coming soon (custody attribution)",
  },
  ar: {
    checkRevenueAnalytics: "تحليلات إجمالي المبيعات",
    checkRevenueOverview: "الأداء المالي",
    checkRevenueTrends: "اتجاهات المبيعات",
    orderSalesAnalytics: "مبيعات الطلبات",
    orderSalesAnalyticsNote:
      "الطلبات المكتملة (المقدَّمة) — قابلة للمقارنة مع مبيعات الطلبات. ليست كل الطلبات المسجّلة.",
    financialPerformance: "الأداء المالي",
    orderSalesPerformance: "تفاصيل مبيعات الطلبات",
    executiveSnapshot: "مؤشرات تنفيذية",
    executiveSnapshotHint:
      "لمحة تنفيذية للفترة — إجمالي المبيعات وصافي المبيعات والمرتجعات والضريبة ومتوسطات الطلبات.",
    taxAnalysis: "الضريبة",
    taxAnalysisPeriodNote:
      "الضريبة المحصّلة تغطي فترة التقرير كاملة — إجمالي الضريبة من جميع الشيكات المدفوعة في النطاق (وليست جزءاً من أقسام محددة).",
    adjustmentsAnalysis: "التسويات",
    financialSummary: "الملخص المالي",
    executiveSummary: "الملخص التنفيذي",
    coverSubtitle: "نظرة على أداء العمل",
    moneyCollected: "الأموال المحصّلة",
    moneyCollectedHint:
      "شيكات الضيوف المدفوعة لهذه الفترة — إجمالي المبيعات. صافي المبيعات يخصم مبلغ المرتجعات.",
    paymentMethodAnalysis: "تحليل المدفوعات",
    paymentMix: "مزيج الدفع",
    tenderAmount: "مبلغ وسيلة الدفع",
    mixPercent: "نسبة المزيج %",
    checksByMethod: "الشيكات المدفوعة (حسب الطريقة)",
    averageCheckByMethod: "متوسط الشيك (حسب الطريقة)",
    monetaryTenderTotal: "إجمالي مبالغ وسائل الدفع",
    refundTenderTotal: "إجمالي مرتجعات وسائل الدفع",
    refundPaymentMix: "المرتجعات حسب طريقة الدفع",
    paymentAnalyticsNote:
      "مزيج الدفع من معاملات التسوية. إجمالي المبيعات يبقى من الشيكات المدفوعة؛ مرتجعات الوسائل تُعرض منفصلة ولا تستبدل إجمالي المبيعات.",
    paymentMethod: "طريقة الدفع",
    transactions: "المعاملات",
    paymentAnalyticsEmpty: "لا توجد معاملات تسوية لفترة التقرير.",
    paymentAnalyticsLoadError:
      "تعذر تحميل تحليل طرق الدفع. حاول مرة أخرى.",
    refundAnalytics: "تحليل المرتجعات",
    refundAnalyticsNote:
      "منشورات المرتجعات لهذه الفترة. صافي المبيعات = إجمالي المبيعات − مبلغ المرتجعات.",
    refundByOperatorPlaceholder: "المرتجعات حسب الموظف — قريباً (إسناد العهدة)",
    refundByRegisterPlaceholder: "المرتجعات حسب الصندوق — قريباً (إسناد العهدة)",
  },
} as const);

/**
 * PAYMENT-METHOD-CATALOG-UNIFICATION-1 — canonical display labels.
 * Historical brand codes map via preferredPaymentMethodLabel → card.
 */
export const PAYMENT_METHOD_LABELS = Object.freeze({
  cash: { en: "Cash", ar: "نقدًا" },
  card: { en: "Card (network / bank)", ar: "بطاقة (شبكة / بنك)" },
  other: { en: "Other", ar: "أخرى" },
  complimentary: { en: "Complimentary", ar: "مجاني" },
} as const);

export type PaymentMethodLabelCode = keyof typeof PAYMENT_METHOD_LABELS;

export function preferredPaymentMethodLabel(
  method: string,
  language: PresentationLanguage
): string {
  const canonical = toCanonicalPaymentMethod(method);
  const entry =
    PAYMENT_METHOD_LABELS[canonical as PaymentMethodLabelCode];
  if (entry) return entry[language];
  return method;
}

/**
 * KPI ids allowed on the Executive Summary (Exec V2).
 * REPORTING-UX-RATIONALIZATION-1 Rev 2.0 — executive money + order averages.
 * Formulas unchanged; presentation selection only.
 */
export const EXECUTIVE_SUMMARY_KPI_IDS = [
  "revenue",
  "netRevenue",
  "refundPublishedTotal",
  "refundRate",
  "taxCollected",
  "orderCount",
  "averageOrder",
  "averageCheck",
] as const satisfies readonly KpiId[];

export type ExecutiveSummaryKpiId = (typeof EXECUTIVE_SUMMARY_KPI_IDS)[number];
