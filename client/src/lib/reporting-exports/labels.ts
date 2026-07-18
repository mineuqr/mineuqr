/**
 * REPORTING-PRODUCT-SEMANTICS-1 / REPORTING-EXECUTIVE-SUMMARY-RATIONALIZATION-1
 * Export chrome + KPI labels from Product Semantics — no hardcoded KPI names.
 */
import {
  preferredKpiLabel,
  SECTION_TERMINOLOGY,
  SEMANTIC_CLARIFICATIONS,
  type PresentationLanguage,
} from "@shared/reporting-platform";
import type { ReportingExportLanguage } from "./types";

export type ReportingExportLabels = Readonly<{
  brand: string;
  generatedBy: string;
  cover: string;
  reportTitleDefault: string;
  reportTitleMonthly: string;
  reportTitleAnnual: string;
  executive: string;
  financial: string;
  orderSalesRollup: string;
  revenueTrend: string;
  revenue: string;
  orderSales: string;
  orderSalesPeriod: string;
  paidChecks: string;
  averageCheck: string;
  averageOrder: string;
  averageOrderPeriod: string;
  orders: string;
  ordersPeriod: string;
  taxCollected: string;
  complimentaryCount: string;
  complimentaryAmount: string;
  voidedCount: string;
  currency: string;
  pricingMode: string;
  taxPolicy: string;
  period: string;
  periodKey: string;
  orderCount: string;
  completedOrders: string;
  paidCheckCount: string;
  generated: string;
  metric: string;
  value: string;
  restaurantName: string;
  businessName: string;
  chartRevenueTrend: string;
  chartOrderTrend: string;
  printFooter: string;
  confidential: string;
  coverSubtitle: string;
  performanceSection: string;
  orderSalesSection: string;
  adjustmentsSection: string;
  reportingBasisSection: string;
  executiveSnapshotSection: string;
  executiveSnapshotHint: string;
  taxAnalysisSection: string;
  checkRevenueBasis: string;
  orderSalesBasis: string;
  trendInsufficient: string;
  dailyRevenueTitle: string;
  monthlyRevenueTitle: string;
  dailyOrderSalesTitle: string;
  monthlyOrderSalesTitle: string;
  contents: string;
}>;

function langOf(language: ReportingExportLanguage): PresentationLanguage {
  return language === "ar" ? "ar" : "en";
}

export function reportingExportLabels(
  language: ReportingExportLanguage
): ReportingExportLabels {
  const lang = langOf(language);
  const section = SECTION_TERMINOLOGY[lang];
  const clarify = SEMANTIC_CLARIFICATIONS[lang];
  const kpi = (id: Parameters<typeof preferredKpiLabel>[0]) =>
    preferredKpiLabel(id, lang);

  if (lang === "ar") {
    return {
      brand: "MineuQR",
      generatedBy: "أعدّ بواسطة MineuQR",
      cover: "الغلاف",
      reportTitleDefault: "تقرير أداء العمل",
      reportTitleMonthly: "تقرير الأداء الشهري",
      reportTitleAnnual: "تقرير الأداء السنوي",
      coverSubtitle: section.coverSubtitle,
      executive: section.executiveSummary,
      financial: section.financialSummary,
      orderSalesRollup: kpi("orderSales"),
      revenueTrend: section.checkRevenueTrends,
      revenue: kpi("revenue"),
      orderSales: kpi("orderSales"),
      orderSalesPeriod: kpi("orderSales"),
      paidChecks: kpi("paidCheckCount"),
      averageCheck: kpi("averageCheck"),
      averageOrder: kpi("averageOrder"),
      averageOrderPeriod: kpi("averageOrder"),
      orders: kpi("orderCount"),
      ordersPeriod: kpi("orderCount"),
      taxCollected: kpi("taxCollected"),
      complimentaryCount: kpi("complimentaryCount"),
      complimentaryAmount: kpi("complimentaryAmount"),
      voidedCount: kpi("voidedCount"),
      currency: "العملة",
      pricingMode: "أساس التسعير",
      taxPolicy: "السياسة الضريبية",
      period: "فترة التقرير",
      periodKey: "الفترة",
      orderCount: kpi("orderCount"),
      completedOrders: kpi("completedOrders"),
      paidCheckCount: kpi("paidCheckCount"),
      generated: "تاريخ الإصدار",
      metric: "البند",
      value: "القيمة",
      restaurantName: "اسم المطعم",
      businessName: "الاسم التجاري",
      chartRevenueTrend: section.checkRevenueTrends,
      chartOrderTrend: `اتجاه ${kpi("orderSales")}`,
      printFooter: "MineuQR",
      confidential: "سري — للاستخدام الداخلي",
      performanceSection: section.financialPerformance,
      orderSalesSection: section.orderSalesPerformance,
      adjustmentsSection: section.adjustmentsAnalysis,
      reportingBasisSection: "أساس التقرير",
      executiveSnapshotSection: section.executiveSnapshot,
      executiveSnapshotHint: section.executiveSnapshotHint,
      taxAnalysisSection: section.taxAnalysis,
      checkRevenueBasis: clarify.checkRevenue,
      orderSalesBasis: clarify.orderSales,
      trendInsufficient:
        "لا تتوفر مشاهدات كافية لعرض اتجاه موثوق لهذه الفترة.",
      dailyRevenueTitle: kpi("dailySales"),
      monthlyRevenueTitle: `${kpi("revenue")} الشهرية`,
      dailyOrderSalesTitle: `${kpi("orderSales")} اليومية`,
      monthlyOrderSalesTitle: `${kpi("orderSales")} الشهرية`,
      contents: "محتويات التقرير",
    };
  }

  return {
    brand: "MineuQR",
    generatedBy: "Prepared by MineuQR",
    cover: "Cover",
    reportTitleDefault: "Business Performance Report",
    reportTitleMonthly: "Monthly Performance Report",
    reportTitleAnnual: "Annual Performance Report",
    coverSubtitle: section.coverSubtitle,
    executive: section.executiveSummary,
    financial: section.financialSummary,
    orderSalesRollup: kpi("orderSales"),
    revenueTrend: section.checkRevenueTrends,
    revenue: kpi("revenue"),
    orderSales: kpi("orderSales"),
    orderSalesPeriod: kpi("orderSales"),
    paidChecks: kpi("paidCheckCount"),
    averageCheck: kpi("averageCheck"),
    averageOrder: kpi("averageOrder"),
    averageOrderPeriod: kpi("averageOrder"),
    orders: kpi("orderCount"),
    ordersPeriod: kpi("orderCount"),
    taxCollected: kpi("taxCollected"),
    complimentaryCount: kpi("complimentaryCount"),
    complimentaryAmount: kpi("complimentaryAmount"),
    voidedCount: kpi("voidedCount"),
    currency: "Currency",
    pricingMode: "Pricing Basis",
    taxPolicy: "Tax Policy",
    period: "Reporting Period",
    periodKey: "Period",
    orderCount: kpi("orderCount"),
    completedOrders: kpi("completedOrders"),
    paidCheckCount: kpi("paidCheckCount"),
    generated: "Issued",
    metric: "Line Item",
    value: "Amount",
    restaurantName: "Restaurant",
    businessName: "Business Name",
    chartRevenueTrend: section.checkRevenueTrends,
    chartOrderTrend: `${kpi("orderSales")} Trend`,
    printFooter: "MineuQR",
    confidential: "Confidential — Internal Use",
    performanceSection: section.financialPerformance,
    orderSalesSection: section.orderSalesPerformance,
    adjustmentsSection: section.adjustmentsAnalysis,
    reportingBasisSection: "Reporting Basis",
    executiveSnapshotSection: section.executiveSnapshot,
    executiveSnapshotHint: section.executiveSnapshotHint,
    taxAnalysisSection: section.taxAnalysis,
    checkRevenueBasis: clarify.checkRevenue,
    orderSalesBasis: clarify.orderSales,
    trendInsufficient:
      "Insufficient observations are available to present a reliable trend for this reporting period.",
    dailyRevenueTitle: kpi("dailySales"),
    monthlyRevenueTitle: `Monthly ${kpi("revenue")}`,
    dailyOrderSalesTitle: `Daily ${kpi("orderSales")}`,
    monthlyOrderSalesTitle: `Monthly ${kpi("orderSales")}`,
    contents: "Report Contents",
  };
}
