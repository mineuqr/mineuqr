/**
 * Presentation formatting only — no KPI authority.
 * Currency / pricing mode come from Reporting DTO Check snapshots — never live Business Settings.
 */
import type { BusinessMetricsSummaryDto } from "@shared/reporting-platform";
import type { ReportingExportLanguage } from "./types";

export function resolveExportCurrency(
  business: Pick<BusinessMetricsSummaryDto, "currency"> | null | undefined,
  fallbackSymbol: string,
  fallbackCode?: string
): { currencySymbol: string; currencyCode: string } {
  const snap = business?.currency.currencySnapshot;
  return {
    currencySymbol: snap?.currencySymbol || fallbackSymbol || "ر.س",
    currencyCode: snap?.currencyCode || fallbackCode || "SAR",
  };
}

export function formatPricingMode(
  business: BusinessMetricsSummaryDto,
  language: ReportingExportLanguage
): string {
  const mode = business.sampleTaxPolicySnapshot?.mode;
  if (mode === "inclusive") {
    return language === "ar" ? "الأسعار تشمل الضريبة" : "Prices Include Tax";
  }
  if (mode === "exclusive") {
    return language === "ar" ? "الأسعار لا تشمل الضريبة" : "Prices Exclude Tax";
  }
  return language === "ar" ? "—" : "—";
}

export function formatMoneyDisplay(
  amount: string,
  currencySymbol: string
): string {
  return `${amount} ${currencySymbol}`;
}

export function formatNullableCount(value: number | null | undefined): string {
  if (value == null) return "—";
  return String(value);
}
