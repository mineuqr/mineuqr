/**
 * REPORTING-PRODUCT-UX-RESTRUCTURE-2 — Smart drill-down map (presentation navigation).
 * Routes executive cards into existing Financial Analytics sections — no new APIs.
 */

import type { ExecutivePeriodCardId } from "./executivePeriodDashboard";

export type FinancialAnalyticsFocus =
  | "overview"
  | "sales-trend"
  | "payment-cash"
  | "payment-card"
  | "sales-source"
  | "orders"
  | "refunds"
  | "tax"
  | "exports";

export type ExecutiveDrillTarget = Readonly<{
  tab: "financial";
  focus: FinancialAnalyticsFocus;
  /** DOM section id under Financial Analytics */
  sectionId: string;
}>;

export const FINANCIAL_SECTION_IDS = Object.freeze({
  overview: "reporting-fin-overview",
  salesTrend: "reporting-fin-sales-trend",
  payment: "reporting-fin-payment",
  salesSource: "reporting-fin-sales-source",
  orders: "reporting-fin-orders",
  refunds: "reporting-fin-refunds",
  tax: "reporting-fin-tax",
  exports: "reporting-fin-exports",
} as const);

export function executiveCardDrillTarget(
  cardId: ExecutivePeriodCardId
): ExecutiveDrillTarget {
  switch (cardId) {
    case "cashSales":
      return {
        tab: "financial",
        focus: "payment-cash",
        sectionId: FINANCIAL_SECTION_IDS.payment,
      };
    case "cardSales":
      return {
        tab: "financial",
        focus: "payment-card",
        sectionId: FINANCIAL_SECTION_IDS.payment,
      };
    case "refundPublishedTotal":
      return {
        tab: "financial",
        focus: "refunds",
        sectionId: FINANCIAL_SECTION_IDS.refunds,
      };
    case "taxCollected":
      return {
        tab: "financial",
        focus: "tax",
        sectionId: FINANCIAL_SECTION_IDS.tax,
      };
    case "orderCount":
      return {
        tab: "financial",
        focus: "orders",
        sectionId: FINANCIAL_SECTION_IDS.orders,
      };
    case "netRevenue":
      return {
        tab: "financial",
        focus: "sales-trend",
        sectionId: FINANCIAL_SECTION_IDS.salesTrend,
      };
  }
}

export function focusBreadcrumbLabel(
  focus: FinancialAnalyticsFocus | null,
  language: "en" | "ar"
): string | null {
  if (!focus || focus === "overview") return null;
  const en: Record<Exclude<FinancialAnalyticsFocus, "overview">, string> = {
    "sales-trend": "Sales Trend",
    "payment-cash": "Payment Analysis · Cash",
    "payment-card": "Payment Analysis · Card",
    "sales-source": "Sales Source",
    orders: "Orders Details",
    refunds: "Refund Analysis",
    tax: "Tax Analysis",
    exports: "Exports",
  };
  const ar: Record<Exclude<FinancialAnalyticsFocus, "overview">, string> = {
    "sales-trend": "اتجاه المبيعات",
    "payment-cash": "تحليل المدفوعات · نقد",
    "payment-card": "تحليل المدفوعات · بطاقات",
    "sales-source": "مصدر المبيعات",
    orders: "تفاصيل الطلبات",
    refunds: "تحليل المرتجعات",
    tax: "تحليل الضريبة",
    exports: "التصدير",
  };
  return language === "ar" ? ar[focus] : en[focus];
}
