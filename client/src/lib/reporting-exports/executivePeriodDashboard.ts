/**
 * REPORTING-PRODUCT-UX-RESTRUCTURE-1/2 — Today / This Month executive cards.
 * Presentation only: aggregates Payment Method Analytics buckets + Business Metrics
 * + Order Sales summary. Does NOT invent KPI formulas or replace Total Sales.
 */

import {
  preferredPaymentMethodLabel,
  preferredKpiLabel,
  type BusinessMetricsSummaryDto,
  type PaymentMethodAnalyticsDto,
  type PresentationLanguage,
} from "@shared/reporting-platform";
import { toCanonicalPaymentMethod } from "@shared/operational-session";
import { formatNullableCount } from "./format";

export type ExecutivePeriodScope = "today" | "month";

export type ExecutivePeriodCardId =
  | "cashSales"
  | "cardSales"
  | "refundPublishedTotal"
  | "taxCollected"
  | "orderCount"
  | "netRevenue";

export type ExecutivePeriodCardCategory =
  | "cash"
  | "card"
  | "refund"
  | "tax"
  | "orders"
  | "net";

export type ExecutivePeriodCard = Readonly<{
  id: ExecutivePeriodCardId;
  category: ExecutivePeriodCardCategory;
  label: string;
  value: string;
  caption: string;
}>;

export type ExecutivePeriodDashboardVm = Readonly<{
  scope: ExecutivePeriodScope;
  title: string;
  subtitle: string;
  primaryQuestion: string;
  cards: readonly ExecutivePeriodCard[];
}>;

const COPY = Object.freeze({
  en: {
    todayTitle: "Today",
    todaySubtitle: "This business day — understand the shift in five seconds.",
    todayQuestion: "How is the restaurant doing today?",
    monthTitle: "This Month",
    monthSubtitle: "Same layout as Today — monthly period only.",
    monthQuestion: "How is the restaurant doing this month?",
    cashSales: "Cash Sales",
    cardSales: "Card Sales",
    cashHint: "Cash tenders in this period",
    cardHint: "Card and electronic tenders in this period",
  },
  ar: {
    todayTitle: "اليوم",
    todaySubtitle: "يوم العمل الحالي — افهم الأداء في خمس ثوانٍ.",
    todayQuestion: "كيف يسير المطعم اليوم؟",
    monthTitle: "هذا الشهر",
    monthSubtitle: "نفس تجربة اليوم — لنطاق الشهر فقط.",
    monthQuestion: "كيف يسير المطعم هذا الشهر؟",
    cashSales: "مبيعات نقدية",
    cardSales: "مبيعات بطاقات",
    cashHint: "مبالغ النقد في هذه الفترة",
    cardHint: "مبالغ البطاقات والوسائل الإلكترونية في هذه الفترة",
  },
} as const);

function sumTenderByCanonical(
  analytics: PaymentMethodAnalyticsDto | null | undefined,
  canonical: "cash" | "card"
): string {
  if (!analytics?.buckets?.length) return "0.00";
  let total = 0;
  for (const b of analytics.buckets) {
    if (toCanonicalPaymentMethod(b.paymentMethod) === canonical) {
      const n = Number.parseFloat(String(b.tenderAmount).replace(/,/g, ""));
      if (Number.isFinite(n)) total += n;
    }
  }
  return total.toFixed(2);
}

/**
 * Build Today / This Month dashboard cards from existing reporting DTOs.
 */
export function buildExecutivePeriodDashboardVm(input: {
  scope: ExecutivePeriodScope;
  language: PresentationLanguage;
  business: BusinessMetricsSummaryDto | null | undefined;
  payment: PaymentMethodAnalyticsDto | null | undefined;
  orderCount: number | null | undefined;
  formatMoney: (amount: string) => string;
}): ExecutivePeriodDashboardVm {
  const lang = input.language;
  const copy = COPY[lang];
  const biz = input.business;
  const formatMoney = input.formatMoney;

  const cash = sumTenderByCanonical(input.payment, "cash");
  const card = sumTenderByCanonical(input.payment, "card");

  const cards: ExecutivePeriodCard[] = [
    {
      id: "cashSales",
      category: "cash",
      label: copy.cashSales,
      value: formatMoney(cash),
      caption: copy.cashHint,
    },
    {
      id: "cardSales",
      category: "card",
      label: copy.cardSales,
      value: formatMoney(card),
      caption: copy.cardHint,
    },
    {
      id: "refundPublishedTotal",
      category: "refund",
      label: preferredKpiLabel("refundPublishedTotal", lang),
      value: formatMoney(biz?.refundPublishedTotal ?? "0.00"),
      caption:
        lang === "ar" ? "إجمالي المرتجعات لهذه الفترة" : "Refunds in this period",
    },
    {
      id: "taxCollected",
      category: "tax",
      label: preferredKpiLabel("taxCollected", lang),
      value: formatMoney(biz?.taxCollected ?? "0.00"),
      caption:
        lang === "ar" ? "الضريبة المحصّلة" : "Tax collected on paid sales",
    },
    {
      id: "orderCount",
      category: "orders",
      label: preferredKpiLabel("orderCount", lang),
      value: formatNullableCount(input.orderCount),
      caption:
        lang === "ar" ? "عدد الطلبات المسجّلة" : "Orders recorded in this period",
    },
    {
      id: "netRevenue",
      category: "net",
      label: preferredKpiLabel("netRevenue", lang),
      value: formatMoney(biz?.netRevenue ?? "0.00"),
      caption:
        lang === "ar"
          ? "إجمالي المبيعات − المرتجعات"
          : "Total Sales − Refund Amount",
    },
  ];

  if (input.scope === "today") {
    return {
      scope: "today",
      title: copy.todayTitle,
      subtitle: copy.todaySubtitle,
      primaryQuestion: copy.todayQuestion,
      cards,
    };
  }

  return {
    scope: "month",
    title: copy.monthTitle,
    subtitle: copy.monthSubtitle,
    primaryQuestion: copy.monthQuestion,
    cards,
  };
}

/** Ensure payment label helper stays available for Financial Analytics. */
export function paymentMethodDisplayLabel(
  method: string,
  language: PresentationLanguage
): string {
  return preferredPaymentMethodLabel(method, language);
}

function isZeroMoney(amount: string | null | undefined): boolean {
  const n = Number.parseFloat(String(amount ?? "0").replace(/,/g, ""));
  return !Number.isFinite(n) || n === 0;
}

/**
 * True when the period has no recorded business activity (avoid a wall of zeros).
 * Call only after loading has finished for the period.
 */
export function isExecutivePeriodEmpty(input: {
  business: BusinessMetricsSummaryDto | null | undefined;
  payment: PaymentMethodAnalyticsDto | null | undefined;
  orderCount: number | null | undefined;
}): boolean {
  const orders = input.orderCount ?? 0;
  if (orders > 0) return false;
  const biz = input.business;
  if (biz) {
    if (!isZeroMoney(biz.revenue)) return false;
    if (!isZeroMoney(biz.netRevenue)) return false;
    if (!isZeroMoney(biz.refundPublishedTotal)) return false;
    if (!isZeroMoney(biz.taxCollected)) return false;
  }
  if (input.payment) {
    if (!isZeroMoney(input.payment.monetaryTenderTotal)) return false;
    if (!isZeroMoney(sumTenderByCanonical(input.payment, "cash"))) return false;
    if (!isZeroMoney(sumTenderByCanonical(input.payment, "card"))) return false;
  }
  // After load: no DTO activity (or all-zero DTOs) → empty experience.
  return true;
}
