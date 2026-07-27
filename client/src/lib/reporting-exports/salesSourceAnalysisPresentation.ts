/**
 * REPORTING-SALES-CHANNEL-ANALYTICS-1 — Sales Source presentation VM.
 *
 * Binds SalesChannelAnalyticsDto only. Never invents channel totals or mix %.
 * Future ordering channels appear automatically when Reporting publishes them.
 */

import {
  REPORTING_SALES_CHANNEL_CATALOG,
  reportingSalesChannelLabel,
} from "@shared/ordering-platform";
import type {
  PresentationLanguage,
  SalesChannelAnalyticsDto,
} from "@shared/reporting-platform";

/** Product channel ids (labels). Extensible — unknown ids render with their code. */
export type SalesSourceChannelId =
  | "table"
  | "waiter"
  | "qr"
  | "kiosk"
  | (string & {});

export type SalesSourceChannelFact = Readonly<{
  channelId: SalesSourceChannelId;
  /** Pre-formatted display amount from reporting — never calculated in UI. */
  amountDisplay: string;
  /** Optional count from reporting — never derived in UI. */
  countDisplay?: string;
  /** Optional sales mix % from reporting DTO — never recalculated. */
  salesMixDisplay?: string;
}>;

export type SalesSourceChannelCard = Readonly<{
  channelId: string;
  label: string;
  amountDisplay: string | null;
  countDisplay: string | null;
  salesMixDisplay: string | null;
  hasFact: boolean;
}>;

export type SalesSourceAnalysisVm = Readonly<{
  title: string;
  description: string;
  /** True when reporting published at least one channel with orders or sales. */
  hasAnyFact: boolean;
  /**
   * True only when the Reporting Platform DTO is not bound yet
   * (legacy hotfix path). Live API binding sets this false.
   */
  projectionUnavailable: boolean;
  unavailableMessage: string;
  cards: readonly SalesSourceChannelCard[];
  totalSalesAmount: string | null;
  totalOrderCount: number | null;
}>;

/** Primary product cards — mobile / future append after catalog activity. */
const PRIMARY_CARD_ORDER: readonly string[] = [
  "table",
  "waiter",
  "qr",
  "kiosk",
];

/**
 * Map Reporting DTO buckets → passive presentation facts.
 * Formats count / mix strings for display only — no arithmetic.
 */
export function mapSalesChannelAnalyticsToFacts(
  analytics: SalesChannelAnalyticsDto,
  language: PresentationLanguage
): readonly SalesSourceChannelFact[] {
  const byId = new Map(analytics.buckets.map((b) => [b.channelId, b]));
  const ids = [
    ...PRIMARY_CARD_ORDER,
    ...REPORTING_SALES_CHANNEL_CATALOG.filter(
      (id) => !PRIMARY_CARD_ORDER.includes(id)
    ),
    ...analytics.buckets
      .map((b) => b.channelId)
      .filter(
        (id) =>
          !PRIMARY_CARD_ORDER.includes(id) &&
          !(REPORTING_SALES_CHANNEL_CATALOG as readonly string[]).includes(id)
      ),
  ];
  const uniqueIds = [...new Set(ids)];

  return uniqueIds.map((channelId) => {
    const bucket = byId.get(channelId);
    if (!bucket) {
      return {
        channelId,
        amountDisplay: "0.00",
        countDisplay:
          language === "ar" ? "0 طلب · 0.00%" : "0 orders · 0.00%",
        salesMixDisplay: "0.00%",
      };
    }
    const orderMix = bucket.orderMixPercent;
    return {
      channelId,
      amountDisplay: bucket.salesAmount,
      countDisplay:
        language === "ar"
          ? `${bucket.orderCount} طلب · ${orderMix}%`
          : `${bucket.orderCount} orders · ${orderMix}%`,
      salesMixDisplay: `${bucket.salesMixPercent}%`,
    };
  });
}

/**
 * Build Sales Source cards from reporting channel facts only.
 * Pass `facts: null` when no channel reporting contract/DTO is available.
 * Pass `facts: []` when the contract exists but the period has zero activity.
 * Prefer `buildSalesSourceAnalysisVmFromDto` for the live Reporting API.
 */
export function buildSalesSourceAnalysisVm(input: {
  language: PresentationLanguage;
  /** null = projection not published by Reporting Platform. */
  facts: readonly SalesSourceChannelFact[] | null;
}): SalesSourceAnalysisVm {
  const lang = input.language;
  const title = lang === "ar" ? "تحليل مصدر المبيعات" : "Sales Source Analysis";

  if (input.facts == null) {
    return {
      title,
      description:
        lang === "ar"
          ? "تفصيل المبيعات حسب قناة الطلب يظهر عند نشره من منصة التقارير."
          : "Sales by ordering channel appear when Reporting publishes channel facts.",
      hasAnyFact: false,
      projectionUnavailable: true,
      unavailableMessage:
        lang === "ar"
          ? "لا توجد حقائق قنوات طلب في عقود التقارير الحالية. إجمالي المبيعات والمدفوعات متاحة في الأقسام الأخرى."
          : "Ordering-channel facts are not in current reporting contracts. Total Sales and payments remain available in other sections.",
      cards: [],
      totalSalesAmount: null,
      totalOrderCount: null,
    };
  }

  const byId = new Map(input.facts.map((f) => [f.channelId, f]));
  const ids = [
    ...PRIMARY_CARD_ORDER,
    ...input.facts
      .map((f) => f.channelId)
      .filter((id) => !PRIMARY_CARD_ORDER.includes(id)),
  ];
  const uniqueIds = [...new Set(ids)];

  const cards: SalesSourceChannelCard[] = uniqueIds.map((channelId) => {
    const fact = byId.get(channelId);
    return {
      channelId,
      label: reportingSalesChannelLabel(channelId, lang),
      amountDisplay: fact?.amountDisplay ?? null,
      countDisplay: fact?.countDisplay ?? null,
      salesMixDisplay: fact?.salesMixDisplay ?? null,
      hasFact: fact != null,
    };
  });

  const hasAnyFact = cards.some(
    (c) =>
      c.hasFact &&
      c.amountDisplay != null &&
      c.amountDisplay !== "0.00"
  );

  return {
    title,
    description:
      lang === "ar"
        ? "المبيعات حسب قناة الطلب للفترة المحددة — من حقائق التقارير فقط."
        : "Sales by ordering channel for the selected period — reporting facts only.",
    hasAnyFact,
    projectionUnavailable: false,
    unavailableMessage:
      lang === "ar"
        ? "لا توجد مبيعات حسب القناة لهذه الفترة."
        : "No channel sales recorded for this period.",
    cards,
    totalSalesAmount: null,
    totalOrderCount: null,
  };
}

/**
 * Live Reporting Platform binding — presentation remains passive.
 */
export function buildSalesSourceAnalysisVmFromDto(input: {
  language: PresentationLanguage;
  analytics: SalesChannelAnalyticsDto;
}): SalesSourceAnalysisVm {
  const facts = mapSalesChannelAnalyticsToFacts(
    input.analytics,
    input.language
  );
  const base = buildSalesSourceAnalysisVm({
    language: input.language,
    facts,
  });
  const hasAnyFact =
    input.analytics.totalOrderCount > 0 ||
    input.analytics.totalSalesAmount !== "0.00";

  return {
    ...base,
    hasAnyFact,
    projectionUnavailable: false,
    totalSalesAmount: input.analytics.totalSalesAmount,
    totalOrderCount: input.analytics.totalOrderCount,
    cards: base.cards.map((c) => ({
      ...c,
      // Catalog zeros still count as published facts (empty period).
      hasFact: true,
    })),
  };
}
