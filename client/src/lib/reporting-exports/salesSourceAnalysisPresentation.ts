/**
 * REPORTING-PRODUCT-HOTFIX-1 — Sales Source presentation VM.
 *
 * Canonical facts would come from a Reporting Platform channel DTO.
 * Today no such contract exists (see program RCA). Presentation MUST NOT invent totals.
 * Never invents channel amounts in the UI.
 *
 * When a future DTO publishes channel rows, bind them here — no UI math.
 */

import type { PresentationLanguage } from "@shared/reporting-platform";

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
}>;

export type SalesSourceChannelCard = Readonly<{
  channelId: string;
  label: string;
  amountDisplay: string | null;
  countDisplay: string | null;
  hasFact: boolean;
}>;

export type SalesSourceAnalysisVm = Readonly<{
  title: string;
  description: string;
  /** True when reporting published at least one channel fact for the period. */
  hasAnyFact: boolean;
  /** True when the reporting platform has not yet published a channel contract. */
  projectionUnavailable: boolean;
  unavailableMessage: string;
  cards: readonly SalesSourceChannelCard[];
}>;

const CHANNEL_LABELS = Object.freeze({
  en: {
    table: "Table Sessions",
    waiter: "Waiter Orders",
    qr: "QR Ordering",
    kiosk: "Self Ordering Kiosk",
  },
  ar: {
    table: "جلسات الطاولات",
    waiter: "طلبات الويتر",
    qr: "الطلب عبر QR",
    kiosk: "كيوسك الطلب الذاتي",
  },
} as const);

const KNOWN_ORDER: readonly SalesSourceChannelId[] = [
  "table",
  "waiter",
  "qr",
  "kiosk",
];

function labelFor(
  channelId: string,
  language: PresentationLanguage
): string {
  const map = CHANNEL_LABELS[language] as Record<string, string>;
  return map[channelId] ?? channelId;
}

/**
 * Build Sales Source cards from reporting channel facts only.
 * Pass `facts: null` when no channel reporting contract/DTO is available.
 * Pass `facts: []` when the contract exists but the period has zero activity.
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
    };
  }

  const byId = new Map(input.facts.map((f) => [f.channelId, f]));
  const ids = [
    ...KNOWN_ORDER,
    ...input.facts
      .map((f) => f.channelId)
      .filter((id) => !KNOWN_ORDER.includes(id as SalesSourceChannelId)),
  ];
  const uniqueIds = [...new Set(ids)];

  const cards: SalesSourceChannelCard[] = uniqueIds.map((channelId) => {
    const fact = byId.get(channelId);
    return {
      channelId,
      label: labelFor(channelId, lang),
      amountDisplay: fact?.amountDisplay ?? null,
      countDisplay: fact?.countDisplay ?? null,
      hasFact: fact != null,
    };
  });

  const hasAnyFact = cards.some((c) => c.hasFact);

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
  };
}
