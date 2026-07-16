/**
 * REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-2 — period presentation helpers.
 * Formats reporting-period and trend axis labels for executive documents.
 */
import { toWesternDigits } from "./format";
import type { ReportingExportLanguage, ReportingExportScope } from "./types";

const EN_MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const AR_MONTHS_SHORT = [
  "ينا",
  "فبر",
  "مار",
  "أبر",
  "ماي",
  "يون",
  "يول",
  "أغس",
  "سبت",
  "أكت",
  "نوف",
  "ديس",
] as const;

/** Scope badge for cover / headers — Monthly vs Annual. */
export function formatReportScopeLabel(
  scope: ReportingExportScope,
  language: ReportingExportLanguage
): string {
  if (scope === "month") {
    return language === "ar" ? "تقرير شهري" : "Monthly Report";
  }
  return language === "ar" ? "تقرير سنوي" : "Annual Report";
}

/**
 * Trend axis label from DTO periodKey.
 * Month scope (day keys YYYY-MM-DD): "1 Jul" / "1 يول"
 * Year scope (month keys YYYY-MM): "Jan" / "ينا"
 */
export function formatTrendAxisLabel(
  periodKey: string,
  scope: ReportingExportScope,
  language: ReportingExportLanguage
): string {
  const key = toWesternDigits(periodKey.trim());
  if (scope === "year") {
    const m = key.match(/^(\d{4})-(\d{2})$/);
    if (m) {
      const monthIndex = Number(m[2]) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return language === "ar"
          ? AR_MONTHS_SHORT[monthIndex]!
          : EN_MONTHS_SHORT[monthIndex]!;
      }
    }
  }

  const d = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (d) {
    const day = String(Number(d[3]));
    const monthIndex = Number(d[2]) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      const mon =
        language === "ar"
          ? AR_MONTHS_SHORT[monthIndex]!
          : EN_MONTHS_SHORT[monthIndex]!;
      return toWesternDigits(`${day} ${mon}`);
    }
  }

  return key;
}

/** Minimum observations required to render a trend chart. */
export const MIN_TREND_OBSERVATIONS = 2;

export function hasRenderableTrend(pointCount: number): boolean {
  return pointCount >= MIN_TREND_OBSERVATIONS;
}
