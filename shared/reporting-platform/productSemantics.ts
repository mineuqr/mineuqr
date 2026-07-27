/**
 * REPORTING-PRODUCT-SEMANTICS-1 — canonical user-facing KPI terminology.
 * REPORTING-BUSINESS-TERMINOLOGY-FINANCIAL-GOVERNANCE-ADOPTION-1 —
 * Business Language on all user-facing surfaces; architecture language stays internal.
 *
 * Governs presentation labels only. Does not change KPI IDs, formulas,
 * DTO fields, or Reporting APIs.
 *
 * KPI Governance defines WHAT is measured.
 * Product Semantics defines HOW it is named for restaurant users.
 *
 * Permanent rule: Business terminology MUST NEVER dictate architecture.
 * Architecture terminology MUST NEVER leak into user-facing interfaces.
 */

import { toCanonicalPaymentMethod } from "../operational-session/check/paymentMethod";
import type { KpiId } from "./kpiDictionary";
import { getKpiDefinition } from "./kpiDictionary";

export const PRODUCT_SEMANTICS_PROGRAM_ID =
  "REPORTING-PRODUCT-SEMANTICS-1" as const;

export type PresentationLanguage = "en" | "ar";

/**
 * Preferred restaurant-facing labels (Business Language).
 * Financial: Total Sales · Operational: Sales Orders.
 * KPI ids and formulas unchanged.
 */
export const PREFERRED_KPI_LABELS: Readonly<
  Record<KpiId, Readonly<{ en: string; ar: string }>>
> = Object.freeze({
  revenue: { en: "Total Sales", ar: "إجمالي المبيعات" },
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
  dailySales: { en: "Daily Total Sales", ar: "إجمالي المبيعات اليومية" },
  orderSales: { en: "Sales Orders", ar: "مبيعات الطلبات" },
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
 * Labels that must not be used as synonyms for Total Sales or Sales Orders.
 * Presentation must not reintroduce these as primary KPI names.
 */
export const DEPRECATED_PRESENTATION_LABELS = Object.freeze({
  /** Must not replace Total Sales (KPI id: revenue) */
  forCheckRevenue: [
    "Revenue",
    "Paid Revenue",
    "Settlement",
    "Settlement Revenue",
    "Sales",
    "Check Revenue",
    "Gross Sales",
    "Check Sales",
    "Session Sales",
    "الإيرادات",
    "المبيعات",
  ],
  /** Must not replace Sales Orders (KPI id: orderSales) */
  forOrderSales: [
    "Revenue",
    "Gross Sales",
    "Total Sales",
    "Net Sales",
    "Paid Revenue",
    "Settlement",
    "Check Revenue",
    "Order Sales",
    "Check Sales",
    "Session Sales",
  ],
} as const);

/** User-facing clarifications — Business Language only (no architecture leakage). */
export const SEMANTIC_CLARIFICATIONS = Object.freeze({
  en: {
    checkRevenue:
      "Total Sales = financial sales after payment across all sales channels (not Sales Orders).",
    orderSales:
      "Sales Orders = completed (served) order totals from operational order activity (not Total Sales).",
    averagePair:
      "Average Check uses Total Sales; Average Order uses Sales Orders.",
    orderSalesPopulation:
      "Sales Orders, Completed Orders, and Average Order share the completed (served) population. Orders (orderCount) counts every order placed.",
  },
  ar: {
    checkRevenue:
      "إجمالي المبيعات = المبيعات المالية بعد الدفع عبر كل قنوات البيع (وليست مبيعات الطلبات).",
    orderSales:
      "مبيعات الطلبات = مجموع الطلبات المكتملة من النشاط التشغيلي للطلبات (وليست إجمالي المبيعات).",
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

/** Section titles — Operational vs Financial reporting (Business Language). */
export const SECTION_TERMINOLOGY = Object.freeze({
  en: {
    checkRevenueAnalytics: "Total Sales Analytics",
    checkRevenueOverview: "Financial Performance",
    checkRevenueTrends: "Sales Trends",
    orderSalesAnalytics: "Sales Orders",
    orderSalesAnalyticsNote:
      "Completed (served) orders — comparable with Sales Orders. Not every order placed.",
    financialPerformance: "Financial Performance",
    orderSalesPerformance: "Sales Orders Detail",
    executiveSnapshot: "Executive Overview",
    executiveSnapshotHint:
      "Decision flow at a glance — Total Sales first, then orders, refunds, and collection. Net Sales is in Financial Analytics.",
    salesAnalytics: "Sales Analytics",
    salesAnalyticsNote:
      "Operational sales trends and period detail — not a second financial statement.",
    financialAnalytics: "Financial Analytics",
    financialAnalyticsNote:
      "Financial detail, refunds, payments, and tax for the selected period.",
    reportingExports: "Exports",
    reportingExportsNote: "Download an Excel workbook for the selected period.",
    paymentOverview: "Payment Overview",
    paymentOverviewHint: "How customers paid during this period.",
    advancedFinancial: "Advanced Financial",
    advancedFinancialNote:
      "Secondary indicators — averages, complimentary, and paid-check counts.",
    taxAnalysis: "Tax Analysis",
    taxAnalysisPeriodNote:
      "Tax collected on paid sales for the full selected period.",
    adjustmentsAnalysis: "Adjustments",
    financialSummary: "Financial Analytics",
    executiveSummary: "Executive Overview",
    coverSubtitle: "Business performance overview",
    moneyCollected: "Money Collected",
    moneyCollectedHint:
      "Paid guest checks for this reporting period — Total Sales. Net Sales subtracts Refund Amount.",
    paymentMethodAnalysis: "Payment Analytics",
    paymentMix: "Payment Mix",
    tenderAmount: "Amount",
    mixPercent: "Mix %",
    checksByMethod: "Paid Checks",
    averageCheckByMethod: "Average Check",
    monetaryTenderTotal: "Total Payments",
    refundTenderTotal: "Refund Payments",
    refundPaymentMix: "Refunds by Payment Method",
    paymentAnalyticsNote:
      "How customers paid. Total Sales stays the financial sales total; refunds are shown separately.",
    paymentMethod: "Payment Method",
    transactions: "Transactions",
    paymentAnalyticsEmpty:
      "No payments recorded for this period yet.",
    paymentAnalyticsLoadError:
      "Payment analysis could not be loaded. Please try again.",
    refundAnalytics: "Refund Analysis",
    refundAnalyticsNote:
      "Refunds for this period. Net Sales = Total Sales − Refund Amount.",
    refundByOperatorPlaceholder: "Refunds by staff — coming soon",
    refundByRegisterPlaceholder: "Refunds by register — coming soon",
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
    executiveSnapshot: "نظرة تنفيذية",
    executiveSnapshotHint:
      "مسار القرار بنظرة سريعة — إجمالي المبيعات أولاً ثم الطلبات والمرتجعات والتحصيل. صافي المبيعات في التحليلات المالية.",
    salesAnalytics: "تحليلات المبيعات",
    salesAnalyticsNote:
      "اتجاهات المبيعات التشغيلية وتفاصيل الفترة — وليست بياناً مالياً ثانياً.",
    financialAnalytics: "التحليلات المالية",
    financialAnalyticsNote:
      "التفاصيل المالية بعد الدفع والمرتجعات والمدفوعات والضريبة للفترة المحددة.",
    reportingExports: "التصدير",
    reportingExportsNote: "تنزيل ملف Excel للفترة المحددة.",
    paymentOverview: "نظرة على المدفوعات",
    paymentOverviewHint: "كيف دفع العملاء خلال هذه الفترة.",
    advancedFinancial: "تحليلات مالية متقدمة",
    advancedFinancialNote:
      "مؤشرات ثانوية — المتوسطات والمجاني وعدد الشيكات المدفوعة.",
    taxAnalysis: "تحليل الضريبة",
    taxAnalysisPeriodNote:
      "الضريبة المحصّلة على المبيعات المدفوعة لكامل الفترة المحددة.",
    adjustmentsAnalysis: "التسويات",
    financialSummary: "التحليلات المالية",
    executiveSummary: "نظرة تنفيذية",
    coverSubtitle: "نظرة على أداء العمل",
    moneyCollected: "الأموال المحصّلة",
    moneyCollectedHint:
      "شيكات الضيوف المدفوعة لهذه الفترة — إجمالي المبيعات. صافي المبيعات يخصم مبلغ المرتجعات.",
    paymentMethodAnalysis: "تحليل المدفوعات",
    paymentMix: "مزيج الدفع",
    tenderAmount: "المبلغ",
    mixPercent: "نسبة المزيج %",
    checksByMethod: "الشيكات المدفوعة",
    averageCheckByMethod: "متوسط الشيك",
    monetaryTenderTotal: "إجمالي المدفوعات",
    refundTenderTotal: "مدفوعات المرتجعات",
    refundPaymentMix: "المرتجعات حسب طريقة الدفع",
    paymentAnalyticsNote:
      "كيف دفع العملاء. إجمالي المبيعات يبقى الإجمالي المالي؛ المرتجعات تُعرض منفصلة.",
    paymentMethod: "طريقة الدفع",
    transactions: "المعاملات",
    paymentAnalyticsEmpty: "لا توجد مدفوعات مسجّلة لهذه الفترة بعد.",
    paymentAnalyticsLoadError:
      "تعذر تحميل تحليل المدفوعات. حاول مرة أخرى.",
    refundAnalytics: "تحليل المرتجعات",
    refundAnalyticsNote:
      "المرتجعات لهذه الفترة. صافي المبيعات = إجمالي المبيعات − مبلغ المرتجعات.",
    refundByOperatorPlaceholder: "المرتجعات حسب الموظف — قريباً",
    refundByRegisterPlaceholder: "المرتجعات حسب الصندوق — قريباً",
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
 * KPI ids on the Executive Overview (REPORTING-UX-SIMPLIFICATION-1 +
 * REPORTING-VISUAL-HIERARCHY-1 decision-flow order).
 * Max primary indicators — averages/rates live in secondary Financial analytics.
 * Payment Overview is a presentation card (tender total), not a KPI id.
 * Formulas unchanged; presentation selection + order only.
 *
 * Decision flow: Sold → Orders → Order sales → Refunded → Tax
 * (Net Sales remains Financial — Class 3; not Executive.)
 */
export const EXECUTIVE_SUMMARY_KPI_IDS = [
  "revenue",
  "orderCount",
  "orderSales",
  "refundPublishedTotal",
  "taxCollected",
] as const satisfies readonly KpiId[];

export type ExecutiveSummaryKpiId = (typeof EXECUTIVE_SUMMARY_KPI_IDS)[number];

/** Presentation-only Executive card for payment tender total (not a KPI registry id). */
export const EXECUTIVE_PAYMENT_OVERVIEW_CARD_ID = "paymentOverview" as const;

/**
 * Visual weight for Executive cards (REPORTING-VISUAL-HIERARCHY-1).
 * Presentation only — does not change KPI class or eligibility.
 */
export const EXECUTIVE_CARD_VISUAL_TIER = {
  revenue: "primary",
  orderCount: "secondary",
  orderSales: "secondary",
  refundPublishedTotal: "secondary",
  taxCollected: "supporting",
  paymentOverview: "supporting",
} as const satisfies Record<
  ExecutiveSummaryKpiId | typeof EXECUTIVE_PAYMENT_OVERVIEW_CARD_ID,
  "primary" | "secondary" | "supporting"
>;

export type ExecutiveCardVisualTier =
  (typeof EXECUTIVE_CARD_VISUAL_TIER)[keyof typeof EXECUTIVE_CARD_VISUAL_TIER];
