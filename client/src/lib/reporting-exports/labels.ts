import type { ReportingExportLanguage } from "./types";

export type ReportingExportLabels = Readonly<{
  brand: string;
  executive: string;
  financial: string;
  operational: string;
  catalog: string;
  orderSalesRollup: string;
  revenueTrend: string;
  revenue: string;
  orderSalesToday: string;
  orderSalesMonth: string;
  paidChecks: string;
  averageCheck: string;
  averageOrderToday: string;
  averageOrderMonth: string;
  sessionsActive: string;
  ordersToday: string;
  ordersMonth: string;
  taxCollected: string;
  complimentaryCount: string;
  complimentaryAmount: string;
  voidedCount: string;
  currency: string;
  pricingMode: string;
  occupiedTables: string;
  pendingOrders: string;
  kitchenLoad: string;
  activeOrders: string;
  preparingOrders: string;
  readyOrders: string;
  categories: string;
  items: string;
  menuVisits: string;
  topSellersNote: string;
  period: string;
  periodKey: string;
  orderCount: string;
  completedOrders: string;
  orderSales: string;
  paidCheckCount: string;
  generated: string;
}>;

export function reportingExportLabels(
  language: ReportingExportLanguage
): ReportingExportLabels {
  if (language === "ar") {
    return {
      brand: "MineuQR",
      executive: "الملخص التنفيذي",
      financial: "الملخص المالي",
      operational: "الملخص التشغيلي",
      catalog: "ملخص الكتالوج",
      orderSalesRollup: "تجميع مبيعات الطلبات",
      revenueTrend: "اتجاه الإيرادات",
      revenue: "الإيرادات",
      orderSalesToday: "مبيعات طلبات اليوم",
      orderSalesMonth: "مبيعات طلبات الشهر",
      paidChecks: "شيكات مدفوعة",
      averageCheck: "متوسط الشيك",
      averageOrderToday: "متوسط طلب اليوم",
      averageOrderMonth: "متوسط طلب الشهر",
      sessionsActive: "جلسات نشطة",
      ordersToday: "طلبات اليوم",
      ordersMonth: "طلبات الشهر",
      taxCollected: "الضريبة المحصّلة",
      complimentaryCount: "شيكات مجانية",
      complimentaryAmount: "مبلغ المجانية",
      voidedCount: "شيكات ملغاة",
      currency: "العملة",
      pricingMode: "وضع التسعير",
      occupiedTables: "طاولات مشغولة",
      pendingOrders: "طلبات معلّقة",
      kitchenLoad: "حمل المطبخ",
      activeOrders: "طلبات نشطة",
      preparingOrders: "قيد التحضير",
      readyOrders: "جاهزة",
      categories: "التصنيفات",
      items: "الأصناف",
      menuVisits: "زيارات المنيو",
      topSellersNote:
        "الأصناف الأكثر مبيعاً غير متاحة عبر عقود Reporting الحالية.",
      period: "الفترة",
      periodKey: "الفترة",
      orderCount: "عدد الطلبات",
      completedOrders: "طلبات مكتملة",
      orderSales: "مبيعات الطلبات",
      paidCheckCount: "شيكات مدفوعة",
      generated: "تاريخ التصدير",
    };
  }

  return {
    brand: "MineuQR",
    executive: "Executive Summary",
    financial: "Financial Summary",
    operational: "Operational Summary",
    catalog: "Catalog Summary",
    orderSalesRollup: "Order Sales Rollup",
    revenueTrend: "Revenue Trend",
    revenue: "Revenue",
    orderSalesToday: "Today's Order Sales",
    orderSalesMonth: "Month Order Sales",
    paidChecks: "Paid Checks",
    averageCheck: "Average Check",
    averageOrderToday: "Average Order (Today)",
    averageOrderMonth: "Average Order (Month)",
    sessionsActive: "Active Sessions",
    ordersToday: "Orders (Today)",
    ordersMonth: "Orders (Month)",
    taxCollected: "Tax Collected",
    complimentaryCount: "Complimentary Checks",
    complimentaryAmount: "Complimentary Amount",
    voidedCount: "Voided Checks",
    currency: "Currency",
    pricingMode: "Pricing Mode",
    occupiedTables: "Occupied Tables",
    pendingOrders: "Pending Orders",
    kitchenLoad: "Kitchen Load",
    activeOrders: "Active Orders",
    preparingOrders: "Preparing",
    readyOrders: "Ready",
    categories: "Categories",
    items: "Items",
    menuVisits: "Menu Visits",
    topSellersNote:
      "Top selling items are not available on current Reporting contracts.",
    period: "Period",
    periodKey: "Period",
    orderCount: "Orders",
    completedOrders: "Completed Orders",
    orderSales: "Order Sales",
    paidCheckCount: "Paid Checks",
    generated: "Exported",
  };
}
