/**
 * REPORTING-PAYMENT-METHOD-PRESENTATION-ADOPTION-1
 *
 * Shared Payment Method Analysis view model for Dashboard, Excel, and PDF.
 * Presentation only — values from PaymentMethodAnalyticsDto; labels from Product Semantics.
 * Expands the monetary catalog so every supported method appears (zeros when absent).
 * Period-agnostic: no report-scope branching.
 */

import { MONETARY_PAYMENT_METHODS } from "@shared/operational-session";
import {
  preferredPaymentMethodLabel,
  SECTION_TERMINOLOGY,
  type PaymentMethodAnalyticsDto,
  type PresentationLanguage,
} from "@shared/reporting-platform";

export type PaymentMethodAnalysisRow = Readonly<{
  paymentMethod: string;
  label: string;
  tenderAmount: string;
  checkCount: number;
  averageCheck: string;
  mixPercent: string;
  transactionCount: number;
  /** True when the DTO reported activity for this method. */
  hasActivity: boolean;
}>;

export type PaymentMethodAnalysisViewModel = Readonly<{
  sectionTitle: string;
  sectionNote: string;
  emptyMessage: string;
  loadErrorMessage: string;
  monetaryTenderTotal: string;
  complimentaryLabel: string;
  complimentaryAmount: string;
  /** Full monetary catalog order + any future DTO methods not in catalog. */
  rows: readonly PaymentMethodAnalysisRow[];
  hasActivity: boolean;
}>;

function zeroRow(
  paymentMethod: string,
  lang: PresentationLanguage
): PaymentMethodAnalysisRow {
  return {
    paymentMethod,
    label: preferredPaymentMethodLabel(paymentMethod, lang),
    tenderAmount: "0.00",
    checkCount: 0,
    averageCheck: "0.00",
    mixPercent: "0.00",
    transactionCount: 0,
    hasActivity: false,
  };
}

/**
 * Build a complete Payment Method Analysis view from the canonical Reporting DTO.
 * Does not recompute mix / averages — only fills missing catalog methods with zeros.
 */
export function buildPaymentMethodAnalysisViewModel(input: {
  language: PresentationLanguage;
  analytics: PaymentMethodAnalyticsDto;
}): PaymentMethodAnalysisViewModel {
  const lang = input.language;
  const section = SECTION_TERMINOLOGY[lang];
  const { analytics } = input;
  const byMethod = new Map(
    analytics.buckets.map((b) => [b.paymentMethod, b] as const)
  );

  const rows: PaymentMethodAnalysisRow[] = [];
  const seen = new Set<string>();

  for (const method of MONETARY_PAYMENT_METHODS) {
    seen.add(method);
    const bucket = byMethod.get(method);
    if (!bucket) {
      rows.push(zeroRow(method, lang));
      continue;
    }
    rows.push({
      paymentMethod: method,
      label: preferredPaymentMethodLabel(method, lang),
      tenderAmount: bucket.tenderAmount,
      checkCount: bucket.checkCount,
      averageCheck: bucket.averageCheck,
      mixPercent: bucket.mixPercent,
      transactionCount: bucket.transactionCount,
      hasActivity:
        bucket.transactionCount > 0 ||
        bucket.checkCount > 0 ||
        bucket.tenderAmount !== "0.00",
    });
  }

  // Future / unexpected monetary codes from DTO — append without redesign
  for (const bucket of analytics.buckets) {
    if (seen.has(bucket.paymentMethod)) continue;
    if (bucket.paymentMethod === "complimentary") continue;
    rows.push({
      paymentMethod: bucket.paymentMethod,
      label: preferredPaymentMethodLabel(bucket.paymentMethod, lang),
      tenderAmount: bucket.tenderAmount,
      checkCount: bucket.checkCount,
      averageCheck: bucket.averageCheck,
      mixPercent: bucket.mixPercent,
      transactionCount: bucket.transactionCount,
      hasActivity: true,
    });
  }

  const hasActivity =
    rows.some((r) => r.hasActivity) || analytics.complimentaryAmount !== "0.00";

  return {
    sectionTitle: section.paymentMethodAnalysis,
    sectionNote: section.paymentAnalyticsNote,
    emptyMessage: section.paymentAnalyticsEmpty,
    loadErrorMessage: section.paymentAnalyticsLoadError,
    monetaryTenderTotal: analytics.monetaryTenderTotal,
    complimentaryLabel: preferredPaymentMethodLabel("complimentary", lang),
    complimentaryAmount: analytics.complimentaryAmount,
    rows,
    hasActivity,
  };
}
