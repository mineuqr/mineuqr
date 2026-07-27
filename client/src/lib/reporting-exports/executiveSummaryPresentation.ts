/**
 * REPORTING-UX-RATIONALIZATION-1 Rev 2.0 — Executive Summary Version 2.
 * Presentation only. KPI names from Product Semantics (`preferredKpiLabel`).
 * Formulas unchanged — values from reporting.* DTOs only.
 */

import {
  EXECUTIVE_SUMMARY_KPI_IDS,
  preferredKpiLabel,
  SECTION_TERMINOLOGY,
  type ExecutiveSummaryKpiId,
  type PresentationLanguage,
} from "@shared/reporting-platform";
import type { BusinessMetricsSummaryDto } from "@shared/reporting-platform";
import type { ScopedOrderSalesTotals } from "./scopeTotals";
import { formatNullableCount } from "./format";

export type ExecutiveSummaryCard = Readonly<{
  kpiId: ExecutiveSummaryKpiId;
  /** Canonical Product Semantics label — never invent a different KPI name. */
  label: string;
  value: string;
  /** Plain-language caption for first-time owners (not a KPI rename). */
  caption: string;
}>;

export type ExecutiveSummaryGroup = Readonly<{
  id: "executive";
  title: string;
  hint: string;
  cards: readonly ExecutiveSummaryCard[];
}>;

export type ExecutiveSummaryViewModel = Readonly<{
  sectionTitle: string;
  /** Primary question the page answers. */
  primaryQuestion: string;
  groups: readonly ExecutiveSummaryGroup[];
  /** Where to find detailed financial / payment sections. */
  footerNote: string;
}>;

/** UX captions — explain meaning without replacing Product Semantics names. */
const KPI_CAPTIONS: Readonly<
  Record<ExecutiveSummaryKpiId, Readonly<{ en: string; ar: string }>>
> = Object.freeze({
  revenue: {
    en: "Financial sales for this period across all channels",
    ar: "المبيعات المالية لهذه الفترة عبر كل القنوات",
  },
  netRevenue: {
    en: "Total Sales after published refunds",
    ar: "إجمالي المبيعات بعد المرتجعات المنشورة",
  },
  refundPublishedTotal: {
    en: "Total refunded (published)",
    ar: "إجمالي المرتجعات المنشورة",
  },
  refundRate: {
    en: "Refund Amount as a percent of Total Sales",
    ar: "مبلغ المرتجعات كنسبة من إجمالي المبيعات",
  },
  taxCollected: {
    en: "Tax on paid checks (frozen snapshot)",
    ar: "الضريبة على الشيكات المدفوعة (لقطة مجمّدة)",
  },
  orderCount: {
    en: "All orders placed in this period",
    ar: "كل الطلبات المسجّلة في هذه الفترة",
  },
  averageOrder: {
    en: "Typical size of a completed order",
    ar: "متوسط قيمة الطلب المكتمل",
  },
  averageCheck: {
    en: "Typical size of a paid check",
    ar: "متوسط قيمة الشيك المدفوع",
  },
});

const PAGE_COPY = Object.freeze({
  en: {
    primaryQuestion: "How is the restaurant performing this period?",
    executiveTitle: "Executive KPIs",
    executiveHint:
      "Total Sales, Net Sales, refunds, tax, and order averages for the selected period.",
    footerNote:
      "Details: Financial Performance, Refund Analytics, Payment Analytics, Sales Orders, and Trends follow. Operational rollups are on dedicated sheets.",
  },
  ar: {
    primaryQuestion: "كيف يؤدي المطعم في هذه الفترة؟",
    executiveTitle: "مؤشرات تنفيذية",
    executiveHint:
      "إجمالي المبيعات وصافي المبيعات والمرتجعات والضريبة ومتوسطات الطلبات للفترة المحددة.",
    footerNote:
      "التفاصيل: الأداء المالي وتحليل المرتجعات والمدفوعات ومبيعات الطلبات والاتجاهات. التفاصيل التشغيلية في أوراق مخصصة.",
  },
} as const);

function formatRefundRate(value: string | undefined): string {
  const n = Number.parseFloat(value ?? "0");
  if (!Number.isFinite(n)) return "0.00%";
  return `${n.toFixed(2)}%`;
}

function cardValue(
  kpiId: ExecutiveSummaryKpiId,
  business: BusinessMetricsSummaryDto,
  orderPeriod: ScopedOrderSalesTotals,
  formatMoney: (amount: string) => string
): string {
  switch (kpiId) {
    case "revenue":
      return formatMoney(business.revenue ?? "0.00");
    case "netRevenue":
      return formatMoney(business.netRevenue ?? "0.00");
    case "refundPublishedTotal":
      return formatMoney(business.refundPublishedTotal ?? "0.00");
    case "refundRate":
      return formatRefundRate(business.refundRate);
    case "taxCollected":
      return formatMoney(business.taxCollected ?? "0.00");
    case "orderCount":
      return formatNullableCount(orderPeriod.orderCount);
    case "averageOrder":
      return formatMoney(orderPeriod.averageOrder);
    case "averageCheck":
      return formatMoney(business.averageCheck ?? "0.00");
    default: {
      const _exhaustive: never = kpiId;
      return _exhaustive;
    }
  }
}

function buildCard(
  kpiId: ExecutiveSummaryKpiId,
  lang: PresentationLanguage,
  business: BusinessMetricsSummaryDto,
  orderPeriod: ScopedOrderSalesTotals,
  formatMoney: (amount: string) => string
): ExecutiveSummaryCard {
  return {
    kpiId,
    label: preferredKpiLabel(kpiId, lang),
    value: cardValue(kpiId, business, orderPeriod, formatMoney),
    caption: KPI_CAPTIONS[kpiId][lang],
  };
}

/**
 * Owner-first Executive Summary view model (Excel + PDF) — Exec V2.
 */
export function buildExecutiveSummaryViewModel(input: {
  language: PresentationLanguage;
  business: BusinessMetricsSummaryDto;
  orderPeriod: ScopedOrderSalesTotals;
  formatMoney: (amount: string) => string;
}): ExecutiveSummaryViewModel {
  const lang = input.language;
  const copy = PAGE_COPY[lang];
  const { business, orderPeriod, formatMoney } = input;

  const cards = EXECUTIVE_SUMMARY_KPI_IDS.map((id) =>
    buildCard(id, lang, business, orderPeriod, formatMoney)
  );

  return {
    sectionTitle: SECTION_TERMINOLOGY[lang].executiveSnapshot,
    primaryQuestion: copy.primaryQuestion,
    groups: [
      {
        id: "executive",
        title: copy.executiveTitle,
        hint: copy.executiveHint,
        cards,
      },
    ],
    footerNote: copy.footerNote,
  };
}

/** Flat card list in EXECUTIVE_SUMMARY_KPI_IDS order. */
export function buildExecutiveSummaryCards(input: {
  language: PresentationLanguage;
  business: BusinessMetricsSummaryDto;
  orderPeriod: ScopedOrderSalesTotals;
  formatMoney: (amount: string) => string;
}): readonly ExecutiveSummaryCard[] {
  const vm = buildExecutiveSummaryViewModel(input);
  return vm.groups[0]?.cards ?? [];
}

export function executiveSnapshotSectionTitle(
  language: PresentationLanguage
): string {
  return SECTION_TERMINOLOGY[language].executiveSnapshot;
}

export function executiveSnapshotHint(language: PresentationLanguage): string {
  return SECTION_TERMINOLOGY[language].executiveSnapshotHint;
}

/** Tuple form [label, value] or [label, value, caption]. */
export function executiveSummaryCardTuples(
  cards: readonly ExecutiveSummaryCard[]
): ReadonlyArray<readonly [string, string] | readonly [string, string, string]> {
  return cards.map((c) => [c.label, c.value, c.caption] as const);
}
