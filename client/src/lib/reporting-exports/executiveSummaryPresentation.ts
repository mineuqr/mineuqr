/**
 * REPORTING-EXECUTIVE-SUMMARY-RATIONALIZATION-1 — KPI selection foundation
 * REPORTING-EXECUTIVE-SUMMARY-UX-1 — owner/manager readability
 * REPORTING-EXECUTIVE-SUMMARY-SIMPLIFICATION-1 — operational KPIs only
 *
 * Presentation only. KPI names from Product Semantics (`preferredKpiLabel`).
 * UX grouping / captions / plain-language framing live here — not in Product Semantics.
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
  id: "operational";
  title: string;
  hint: string;
  cards: readonly ExecutiveSummaryCard[];
}>;

export type ExecutiveSummaryViewModel = Readonly<{
  sectionTitle: string;
  /** Primary question the page answers. */
  primaryQuestion: string;
  groups: readonly ExecutiveSummaryGroup[];
  /** Where to find Check Revenue / tax / payment details. */
  footerNote: string;
}>;

/** UX captions — explain meaning without replacing Product Semantics names. */
const KPI_CAPTIONS: Readonly<
  Record<ExecutiveSummaryKpiId, Readonly<{ en: string; ar: string }>>
> = Object.freeze({
  orderSales: {
    en: "Value of orders that were completed (served)",
    ar: "قيمة الطلبات التي اكتملت (قُدّمت)",
  },
  orderCount: {
    en: "How many orders were placed",
    ar: "عدد الطلبات المسجّلة",
  },
  averageOrder: {
    en: "Typical size of a completed order",
    ar: "متوسط قيمة الطلب المكتمل",
  },
});

const PAGE_COPY = Object.freeze({
  en: {
    primaryQuestion: "How is the restaurant performing operationally?",
    operationalTitle: "Orders served",
    operationalHint:
      "From completed kitchen orders — your Order Sales story for this period.",
    footerNote:
      "Check Revenue, Paid Checks, Average Check, and Tax Collected are in Financial Summary. Payment mix is in Payment Method Analysis.",
  },
  ar: {
    primaryQuestion: "كيف يؤدي المطعم تشغيلياً؟",
    operationalTitle: "الطلبات المقدَّمة",
    operationalHint:
      "من الطلبات المكتملة في المطبخ — قصة مبيعات الطلبات لهذه الفترة.",
    footerNote:
      "إيرادات الشيكات وعدد الشيكات المدفوعة ومتوسط الشيك والضريبة المحصّلة في الملخص المالي. مزيج الدفع في تحليل طرق الدفع.",
  },
} as const);

function cardValue(
  kpiId: ExecutiveSummaryKpiId,
  orderPeriod: ScopedOrderSalesTotals,
  formatMoney: (amount: string) => string
): string {
  switch (kpiId) {
    case "orderSales":
      return formatMoney(orderPeriod.orderSales);
    case "orderCount":
      return formatNullableCount(orderPeriod.orderCount);
    case "averageOrder":
      return formatMoney(orderPeriod.averageOrder);
    default: {
      const _exhaustive: never = kpiId;
      return _exhaustive;
    }
  }
}

function buildCard(
  kpiId: ExecutiveSummaryKpiId,
  lang: PresentationLanguage,
  orderPeriod: ScopedOrderSalesTotals,
  formatMoney: (amount: string) => string
): ExecutiveSummaryCard {
  return {
    kpiId,
    label: preferredKpiLabel(kpiId, lang),
    value: cardValue(kpiId, orderPeriod, formatMoney),
    caption: KPI_CAPTIONS[kpiId][lang],
  };
}

/**
 * Owner-first Executive Summary view model (Excel + PDF).
 * Operational KPIs only (SIMPLIFICATION-1). Money Collected → Financial Summary.
 */
export function buildExecutiveSummaryViewModel(input: {
  language: PresentationLanguage;
  business: BusinessMetricsSummaryDto;
  orderPeriod: ScopedOrderSalesTotals;
  formatMoney: (amount: string) => string;
}): ExecutiveSummaryViewModel {
  const lang = input.language;
  const copy = PAGE_COPY[lang];
  const { orderPeriod, formatMoney } = input;

  const cards = EXECUTIVE_SUMMARY_KPI_IDS.map((id) =>
    buildCard(id, lang, orderPeriod, formatMoney)
  );

  return {
    sectionTitle: SECTION_TERMINOLOGY[lang].executiveSnapshot,
    primaryQuestion: copy.primaryQuestion,
    groups: [
      {
        id: "operational",
        title: copy.operationalTitle,
        hint: copy.operationalHint,
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
