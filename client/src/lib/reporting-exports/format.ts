/**
 * Presentation formatting only — no KPI authority.
 * Currency / pricing mode come from Reporting DTO Check snapshots — never live Business Settings.
 *
 * Official MineuQR export policy: Western digits (0-9) for all numeric values
 * in Excel/PDF, regardless of UI language. Arabic labels remain Arabic.
 */
import { formatInRestaurantTimezone } from "@/lib/datetime";
import type { BusinessMetricsSummaryDto } from "@shared/reporting-platform";
import type { ReportingExportLanguage } from "./types";

const EASTERN_ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const EXTENDED_ARABIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/**
 * Convert Eastern/Persian digits to Western 0-9.
 * Also normalizes Arabic decimal (٫) / thousands (٬) separators for export tables.
 * Leaves letters and currency symbols unchanged.
 */
export function toWesternDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const eastern = EASTERN_ARABIC_DIGITS.indexOf(ch);
    if (eastern >= 0) {
      out += String(eastern);
      continue;
    }
    const extended = EXTENDED_ARABIC_DIGITS.indexOf(ch);
    if (extended >= 0) {
      out += String(extended);
      continue;
    }
    if (ch === "٫") {
      out += ".";
      continue;
    }
    if (ch === "٬") {
      out += ",";
      continue;
    }
    out += ch;
  }
  return out;
}

export function exportDateLocale(language: ReportingExportLanguage): string {
  return language === "ar" ? "ar-SA" : "en-GB";
}

/** Localized date/time with Western digits (numberingSystem: latn). */
export function formatExportDateTime(
  date: Date,
  language: ReportingExportLanguage
): string {
  const formatted = formatInRestaurantTimezone(date, exportDateLocale(language), {
    dateStyle: "medium",
    timeStyle: "short",
    numberingSystem: "latn",
  });
  return toWesternDigits(formatted);
}

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

/** Currency display: Western digits + symbol/code. Example: 15,450.75 ر.س */
export function formatMoneyDisplay(
  amount: string,
  currencySymbol: string
): string {
  return `${toWesternDigits(String(amount).trim())} ${currencySymbol}`;
}

export function formatNullableCount(value: number | null | undefined): string {
  if (value == null) return "—";
  return toWesternDigits(String(value));
}

/** Tax policy display from Check Tax Policy Snapshot on the Reporting DTO. */
export function formatTaxPolicySummary(
  business: BusinessMetricsSummaryDto,
  language: ReportingExportLanguage
): string {
  const snap = business.sampleTaxPolicySnapshot;
  if (!snap) return "—";
  if (!snap.enabled) {
    return language === "ar" ? "ضريبة غير مفعّلة (لقطة الشيك)" : "Tax disabled (Check snapshot)";
  }
  if (snap.components.length === 0) {
    return language === "ar" ? "مفعّلة — بدون مكوّنات" : "Enabled — no components";
  }
  const parts: string[] = [];
  for (const c of snap.components) {
    parts.push(`${c.name} ${toWesternDigits(c.ratePercent)}%`);
  }
  return parts.join(" · ");
}

/** Parse DTO money string for Excel numeric cells / chart series (formatting only). */
export function parseDtoAmountForDisplay(value: string): number {
  const n = Number.parseFloat(toWesternDigits(String(value)));
  return Number.isFinite(n) ? n : 0;
}
