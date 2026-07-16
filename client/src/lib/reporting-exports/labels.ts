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
  trendInsufficient: string;
  dailyRevenueTitle: string;
  monthlyRevenueTitle: string;
  dailyOrderSalesTitle: string;
  monthlyOrderSalesTitle: string;
  contents: string;
}>;

export function reportingExportLabels(
  language: ReportingExportLanguage
): ReportingExportLabels {
  if (language === "ar") {
    return {
      brand: "MineuQR",
      generatedBy: "أعدّ بواسطة MineuQR",
      cover: "الغلاف",
      reportTitleDefault: "التقرير المالي التنفيذي",
      reportTitleMonthly: "التقرير المالي الشهري",
      reportTitleAnnual: "التقرير المالي السنوي",
      coverSubtitle: "وثيقة مالية تنفيذية",
      executive: "الملخص التنفيذي",
      financial: "الملخص المالي",
      orderSalesRollup: "مبيعات الطلبات",
      revenueTrend: "اتجاه الإيرادات",
      revenue: "الإيرادات",
      orderSales: "مبيعات الطلبات",
      orderSalesPeriod: "مبيعات الطلبات للفترة",
      paidChecks: "الشيكات المدفوعة",
      averageCheck: "متوسط قيمة الشيك",
      averageOrder: "متوسط قيمة الطلب",
      averageOrderPeriod: "متوسط الطلب للفترة",
      orders: "الطلبات",
      ordersPeriod: "عدد الطلبات للفترة",
      taxCollected: "الضريبة المحصّلة",
      complimentaryCount: "الشيكات المجانية",
      complimentaryAmount: "قيمة الشيكات المجانية",
      voidedCount: "الشيكات الملغاة",
      currency: "العملة",
      pricingMode: "أساس التسعير",
      taxPolicy: "السياسة الضريبية",
      period: "فترة التقرير",
      periodKey: "الفترة",
      orderCount: "عدد الطلبات",
      completedOrders: "الطلبات المكتملة",
      paidCheckCount: "الشيكات المدفوعة",
      generated: "تاريخ الإصدار",
      metric: "البند",
      value: "القيمة",
      restaurantName: "اسم المطعم",
      businessName: "الاسم التجاري",
      chartRevenueTrend: "اتجاه الإيرادات",
      chartOrderTrend: "اتجاه مبيعات الطلبات",
      printFooter: "MineuQR",
      confidential: "سري — للاستخدام الداخلي",
      performanceSection: "الأداء المالي",
      orderSalesSection: "مبيعات الطلبات",
      adjustmentsSection: "التسويات",
      reportingBasisSection: "أساس التقرير",
      trendInsufficient:
        "لا تتوفر مشاهدات كافية لعرض اتجاه موثوق لهذه الفترة.",
      dailyRevenueTitle: "الإيرادات اليومية",
      monthlyRevenueTitle: "الإيرادات الشهرية",
      dailyOrderSalesTitle: "مبيعات الطلبات اليومية",
      monthlyOrderSalesTitle: "مبيعات الطلبات الشهرية",
      contents: "محتويات التقرير",
    };
  }

  return {
    brand: "MineuQR",
    generatedBy: "Prepared by MineuQR",
    cover: "Cover",
    reportTitleDefault: "Executive Financial Report",
    reportTitleMonthly: "Monthly Financial Report",
    reportTitleAnnual: "Annual Financial Report",
    coverSubtitle: "Executive Financial Document",
    executive: "Executive Summary",
    financial: "Financial Summary",
    orderSalesRollup: "Order Sales",
    revenueTrend: "Revenue Trends",
    revenue: "Revenue",
    orderSales: "Order Sales",
    orderSalesPeriod: "Order Sales (Period)",
    paidChecks: "Paid Checks",
    averageCheck: "Average Check",
    averageOrder: "Average Order",
    averageOrderPeriod: "Average Order (Period)",
    orders: "Orders",
    ordersPeriod: "Orders (Period)",
    taxCollected: "Tax Collected",
    complimentaryCount: "Complimentary Checks",
    complimentaryAmount: "Complimentary Amount",
    voidedCount: "Voided Checks",
    currency: "Currency",
    pricingMode: "Pricing Basis",
    taxPolicy: "Tax Policy",
    period: "Reporting Period",
    periodKey: "Period",
    orderCount: "Orders",
    completedOrders: "Completed Orders",
    paidCheckCount: "Paid Checks",
    generated: "Issued",
    metric: "Line Item",
    value: "Amount",
    restaurantName: "Restaurant",
    businessName: "Business Name",
    chartRevenueTrend: "Revenue Trend",
    chartOrderTrend: "Order Sales Trend",
    printFooter: "MineuQR",
    confidential: "Confidential — Internal Use",
    performanceSection: "Financial Performance",
    orderSalesSection: "Order Sales",
    adjustmentsSection: "Adjustments",
    reportingBasisSection: "Reporting Basis",
    trendInsufficient:
      "Insufficient observations are available to present a reliable trend for this reporting period.",
    dailyRevenueTitle: "Daily Revenue",
    monthlyRevenueTitle: "Monthly Revenue",
    dailyOrderSalesTitle: "Daily Order Sales",
    monthlyOrderSalesTitle: "Monthly Order Sales",
    contents: "Report Contents",
  };
}
