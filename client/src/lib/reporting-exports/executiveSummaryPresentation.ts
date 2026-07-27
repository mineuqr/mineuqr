/**
 * REPORTING-UX-SIMPLIFICATION-1 — Executive Overview (max 6 cards).
 * REPORTING-VISUAL-HIERARCHY-1 — Decision-flow order + visual tiers.
 * Presentation only. KPI names from Product Semantics (`preferredKpiLabel`).
 * Formulas unchanged — values from reporting.* DTOs only.
 *
 * Decision flow (approved Exec set):
 * 1. Total Sales (primary)
 * 2. Orders + Sales Orders (secondary)
 * 3. Refund Amount (secondary)
 * 4. Tax + Payment Overview (supporting)
 * Net Sales relationship lives in Financial Analytics (not Executive).
 */

import {
  EXECUTIVE_CARD_VISUAL_TIER,
  EXECUTIVE_PAYMENT_OVERVIEW_CARD_ID,
  EXECUTIVE_SUMMARY_KPI_IDS,
  preferredKpiLabel,
  SECTION_TERMINOLOGY,
  type ExecutiveCardVisualTier,
  type ExecutiveSummaryKpiId,
  type PresentationLanguage,
} from "@shared/reporting-platform";
import type { BusinessMetricsSummaryDto } from "@shared/reporting-platform";
import type { ScopedOrderSalesTotals } from "./scopeTotals";
import { formatNullableCount } from "./format";

export type ExecutiveSummaryCardId =
  | ExecutiveSummaryKpiId
  | typeof EXECUTIVE_PAYMENT_OVERVIEW_CARD_ID;

export type ExecutiveSummaryCard = Readonly<{
  kpiId: ExecutiveSummaryCardId;
  /** Canonical Product Semantics label — never invent a different KPI name. */
  label: string;
  value: string;
  /** Plain-language caption for first-time owners (not a KPI rename). */
  caption: string;
  /** Visual weight — presentation only. */
  visualTier: ExecutiveCardVisualTier;
}>;

export type ExecutiveDecisionBandId =
  | "sold"
  | "orders"
  | "refunds"
  | "collection";

export type ExecutiveSummaryBand = Readonly<{
  id: ExecutiveDecisionBandId;
  title: string;
  hint: string;
  cards: readonly ExecutiveSummaryCard[];
}>;

export type ExecutiveSummaryGroup = Readonly<{
  id: "executive";
  title: string;
  hint: string;
  /** Flat decision-flow order (Excel/PDF + legacy consumers). */
  cards: readonly ExecutiveSummaryCard[];
  /** Visual bands for Dashboard hierarchy. */
  bands: readonly ExecutiveSummaryBand[];
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
  orderSales: {
    en: "Completed (served) order sales for this period",
    ar: "مبيعات الطلبات المكتملة لهذه الفترة",
  },
  orderCount: {
    en: "All orders placed in this period",
    ar: "كل الطلبات المسجّلة في هذه الفترة",
  },
  refundPublishedTotal: {
    en: "Total refunded for this period",
    ar: "إجمالي المرتجعات لهذه الفترة",
  },
  taxCollected: {
    en: "Tax collected on paid sales for this period",
    ar: "الضريبة المحصّلة على المبيعات المدفوعة لهذه الفترة",
  },
});

const PAGE_COPY = Object.freeze({
  en: {
    primaryQuestion: "How is the restaurant performing this period?",
    executiveTitle: "Executive Overview",
    executiveHint:
      "Decision flow: sales → orders → refunds → collection. Open Financial for Net Sales.",
    footerNote:
      "Net Sales = Total Sales − Refund Amount (Financial Analytics). Sales Analytics covers order trends.",
    bandSold: "How much did I sell?",
    bandSoldHint: "Primary financial result",
    bandOrders: "How much order activity?",
    bandOrdersHint: "Order volume and completed sales",
    bandRefunds: "How much was refunded?",
    bandRefundsHint: "Refund impact at a glance",
    bandCollection: "Tax & payments",
    bandCollectionHint: "Supporting collection indicators",
  },
  ar: {
    primaryQuestion: "كيف يؤدي المطعم في هذه الفترة؟",
    executiveTitle: "نظرة تنفيذية",
    executiveHint:
      "مسار القرار: المبيعات ← الطلبات ← المرتجعات ← التحصيل. صافي المبيعات في التحليلات المالية.",
    footerNote:
      "صافي المبيعات = إجمالي المبيعات − مبلغ المرتجعات (التحليلات المالية). تحليلات المبيعات لاتجاهات الطلبات.",
    bandSold: "كم بعت؟",
    bandSoldHint: "النتيجة المالية الأساسية",
    bandOrders: "كم كان نشاط الطلبات؟",
    bandOrdersHint: "حجم الطلبات والمبيعات المكتملة",
    bandRefunds: "كم تم إرجاعه؟",
    bandRefundsHint: "أثر المرتجعات بنظرة سريعة",
    bandCollection: "الضريبة والمدفوعات",
    bandCollectionHint: "مؤشرات تحصيل داعمة",
  },
} as const);

function cardValue(
  kpiId: ExecutiveSummaryKpiId,
  business: BusinessMetricsSummaryDto,
  orderPeriod: ScopedOrderSalesTotals,
  formatMoney: (amount: string) => string
): string {
  switch (kpiId) {
    case "revenue":
      return formatMoney(business.revenue ?? "0.00");
    case "orderSales":
      return formatMoney(orderPeriod.orderSales);
    case "orderCount":
      return formatNullableCount(orderPeriod.orderCount);
    case "refundPublishedTotal":
      return formatMoney(business.refundPublishedTotal ?? "0.00");
    case "taxCollected":
      return formatMoney(business.taxCollected ?? "0.00");
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
    visualTier: EXECUTIVE_CARD_VISUAL_TIER[kpiId],
  };
}

function buildBands(
  cards: readonly ExecutiveSummaryCard[],
  copy: (typeof PAGE_COPY)["en"] | (typeof PAGE_COPY)["ar"]
): readonly ExecutiveSummaryBand[] {
  const byId = new Map(cards.map((c) => [c.kpiId, c]));
  const pick = (...ids: ExecutiveSummaryCardId[]) =>
    ids
      .map((id) => byId.get(id))
      .filter((c): c is ExecutiveSummaryCard => c != null);

  return [
    {
      id: "sold",
      title: copy.bandSold,
      hint: copy.bandSoldHint,
      cards: pick("revenue"),
    },
    {
      id: "orders",
      title: copy.bandOrders,
      hint: copy.bandOrdersHint,
      cards: pick("orderCount", "orderSales"),
    },
    {
      id: "refunds",
      title: copy.bandRefunds,
      hint: copy.bandRefundsHint,
      cards: pick("refundPublishedTotal"),
    },
    {
      id: "collection",
      title: copy.bandCollection,
      hint: copy.bandCollectionHint,
      cards: pick("taxCollected", "paymentOverview"),
    },
  ];
}

/**
 * Owner-first Executive Overview — max 6 cards (5 KPIs + Payment Overview).
 * Decision-flow order + visual tiers (REPORTING-VISUAL-HIERARCHY-1).
 */
export function buildExecutiveSummaryViewModel(input: {
  language: PresentationLanguage;
  business: BusinessMetricsSummaryDto;
  orderPeriod: ScopedOrderSalesTotals;
  formatMoney: (amount: string) => string;
  /** Payment Method Analytics monetary tender total for Payment Overview card. */
  paymentMonetaryTenderTotal?: string | null;
}): ExecutiveSummaryViewModel {
  const lang = input.language;
  const copy = PAGE_COPY[lang];
  const section = SECTION_TERMINOLOGY[lang];
  const { business, orderPeriod, formatMoney } = input;

  const cards: ExecutiveSummaryCard[] = EXECUTIVE_SUMMARY_KPI_IDS.map((id) =>
    buildCard(id, lang, business, orderPeriod, formatMoney)
  );

  cards.push({
    kpiId: EXECUTIVE_PAYMENT_OVERVIEW_CARD_ID,
    label: section.paymentOverview,
    value: formatMoney(input.paymentMonetaryTenderTotal ?? "0.00"),
    caption: section.paymentOverviewHint,
    visualTier: EXECUTIVE_CARD_VISUAL_TIER.paymentOverview,
  });

  return {
    sectionTitle: SECTION_TERMINOLOGY[lang].executiveSnapshot,
    primaryQuestion: copy.primaryQuestion,
    groups: [
      {
        id: "executive",
        title: copy.executiveTitle,
        hint: copy.executiveHint,
        cards,
        bands: buildBands(cards, copy),
      },
    ],
    footerNote: copy.footerNote,
  };
}

/** Flat card list in Executive Overview order. */
export function buildExecutiveSummaryCards(input: {
  language: PresentationLanguage;
  business: BusinessMetricsSummaryDto;
  orderPeriod: ScopedOrderSalesTotals;
  formatMoney: (amount: string) => string;
  paymentMonetaryTenderTotal?: string | null;
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
