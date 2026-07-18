/**
 * REPORTING-EXECUTIVE-SUMMARY-RATIONALIZATION-1 — KPI selection
 * REPORTING-EXECUTIVE-SUMMARY-UX-1 — owner/manager readability
 *
 * Presentation only. KPI names from Product Semantics (`preferredKpiLabel`).
 * UX grouping / captions / plain-language framing live here — not in Product Semantics.
 */

import {
  EXECUTIVE_SUMMARY_KPI_IDS,
  preferredKpiLabel,
  SECTION_TERMINOLOGY,
  SEMANTIC_CLARIFICATIONS,
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
  id: "collected" | "served";
  title: string;
  hint: string;
  cards: readonly ExecutiveSummaryCard[];
}>;

export type ExecutiveSummaryViewModel = Readonly<{
  sectionTitle: string;
  /** Primary question the page answers. */
  primaryQuestion: string;
  groups: readonly ExecutiveSummaryGroup[];
  /** Why Check Revenue and Order Sales can differ. */
  comparisonNote: string;
}>;

/** UX captions — explain meaning without replacing Product Semantics names. */
const KPI_CAPTIONS: Readonly<
  Record<ExecutiveSummaryKpiId, Readonly<{ en: string; ar: string }>>
> = Object.freeze({
  revenue: {
    en: "What guests paid on settled checks",
    ar: "ما دفعه الضيوف على الشيكات المسددة",
  },
  paidCheckCount: {
    en: "How many checks were paid",
    ar: "عدد الشيكات التي تم دفعها",
  },
  averageCheck: {
    en: "Typical size of a paid check",
    ar: "متوسط قيمة الشيك المدفوع",
  },
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

const GROUP_COPY = Object.freeze({
  en: {
    primaryQuestion: "How did the restaurant perform this period?",
    collectedTitle: "Money collected",
    collectedHint: "From paid guest checks — your Check Revenue story.",
    servedTitle: "Orders served",
    servedHint: "From completed kitchen orders — your Order Sales story.",
    comparisonNote:
      "These two money totals measure different things and can differ. Check Revenue is money collected on paid checks; Order Sales is the value of completed orders.",
  },
  ar: {
    primaryQuestion: "كيف كان أداء المطعم في هذه الفترة؟",
    collectedTitle: "الأموال المحصّلة",
    collectedHint: "من شيكات الضيوف المدفوعة — قصة إيرادات الشيكات.",
    servedTitle: "الطلبات المقدَّمة",
    servedHint: "من الطلبات المكتملة في المطبخ — قصة مبيعات الطلبات.",
    comparisonNote:
      "هذان الرقمان الماليان يقيسان شيئين مختلفين وقد يختلفان. إيرادات الشيكات = ما حُصّل من الشيكات المدفوعة؛ مبيعات الطلبات = قيمة الطلبات المكتملة.",
  },
} as const);

const COLLECTED_KPI_IDS = [
  "revenue",
  "paidCheckCount",
  "averageCheck",
] as const satisfies readonly ExecutiveSummaryKpiId[];

const SERVED_KPI_IDS = [
  "orderSales",
  "orderCount",
  "averageOrder",
] as const satisfies readonly ExecutiveSummaryKpiId[];

function cardValue(
  kpiId: ExecutiveSummaryKpiId,
  biz: BusinessMetricsSummaryDto,
  orderPeriod: ScopedOrderSalesTotals,
  formatMoney: (amount: string) => string
): string {
  switch (kpiId) {
    case "revenue":
      return formatMoney(biz.revenue);
    case "paidCheckCount":
      return formatNullableCount(biz.paidCheckCount);
    case "averageCheck":
      return formatMoney(biz.averageCheck);
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
  biz: BusinessMetricsSummaryDto,
  orderPeriod: ScopedOrderSalesTotals,
  formatMoney: (amount: string) => string
): ExecutiveSummaryCard {
  return {
    kpiId,
    label: preferredKpiLabel(kpiId, lang),
    value: cardValue(kpiId, biz, orderPeriod, formatMoney),
    caption: KPI_CAPTIONS[kpiId][lang],
  };
}

/**
 * Owner-first Executive Summary view model (Excel + PDF).
 * Same six KPI ids as RATIONALIZATION-1; improved grouping and plain language.
 */
export function buildExecutiveSummaryViewModel(input: {
  language: PresentationLanguage;
  business: BusinessMetricsSummaryDto;
  orderPeriod: ScopedOrderSalesTotals;
  formatMoney: (amount: string) => string;
}): ExecutiveSummaryViewModel {
  const lang = input.language;
  const copy = GROUP_COPY[lang];
  const { business: biz, orderPeriod, formatMoney } = input;

  const collectedCards = COLLECTED_KPI_IDS.map((id) =>
    buildCard(id, lang, biz, orderPeriod, formatMoney)
  );
  const servedCards = SERVED_KPI_IDS.map((id) =>
    buildCard(id, lang, biz, orderPeriod, formatMoney)
  );

  return {
    sectionTitle: SECTION_TERMINOLOGY[lang].executiveSnapshot,
    primaryQuestion: copy.primaryQuestion,
    groups: [
      {
        id: "collected",
        title: copy.collectedTitle,
        hint: copy.collectedHint,
        cards: collectedCards,
      },
      {
        id: "served",
        title: copy.servedTitle,
        hint: copy.servedHint,
        cards: servedCards,
      },
    ],
    comparisonNote: `${copy.comparisonNote} ${SEMANTIC_CLARIFICATIONS[lang].averagePair}`,
  };
}

/** @deprecated Prefer buildExecutiveSummaryViewModel — kept for flat card lists. */
export function buildExecutiveSummaryCards(input: {
  language: PresentationLanguage;
  business: BusinessMetricsSummaryDto;
  orderPeriod: ScopedOrderSalesTotals;
  formatMoney: (amount: string) => string;
}): readonly ExecutiveSummaryCard[] {
  const vm = buildExecutiveSummaryViewModel(input);
  const out: ExecutiveSummaryCard[] = [];
  for (const g of vm.groups) {
    for (const c of g.cards) out.push(c);
  }
  // Preserve RATIONALIZATION id order for any legacy consumer
  const byId = new Map(out.map((c) => [c.kpiId, c]));
  return EXECUTIVE_SUMMARY_KPI_IDS.map((id) => byId.get(id)!);
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
