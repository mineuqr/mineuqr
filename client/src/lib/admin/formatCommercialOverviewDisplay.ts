/**
 * EXEC-7C.3 / AR-UX-8 — presentation-only formatters for CommercialOverviewSnapshot display.
 * No KPI derivation; values come from admin.getCommercialOverview as-is.
 */

import { formatRiyadhDateTime } from "@/lib/datetime";

export type MetadataDisplayLocale = "ar" | "en";

/** Known authority codes → operator-readable labels (semantics unchanged). */
const AUTHORITY_LABELS: Record<string, Record<MetadataDisplayLocale, string>> = {
  S1_CANONICAL: {
    en: "Unified commercial authority",
    ar: "السلطة التجارية الموحدة",
  },
};

/** Known metrics source codes → operator-readable labels. */
const METRICS_SOURCE_LABELS: Record<string, Record<MetadataDisplayLocale, string>> = {
  CANONICAL_OWNER: {
    en: "Owner subscription records",
    ar: "سجلات اشتراك المالكين",
  },
};

/** Known schema versions → operator-readable labels. */
const SCHEMA_VERSION_LABELS: Record<string, Record<MetadataDisplayLocale, string>> = {
  "EXEC-7C.1": {
    en: "Commercial overview (v1)",
    ar: "نظرة تجارية (الإصدار 1)",
  },
};

export function metadataDisplayFallback(
  locale: MetadataDisplayLocale,
  kind: "unavailable" | "unknown"
): string {
  if (kind === "unavailable") {
    return locale === "ar" ? "غير متاح" : "Not available";
  }
  return locale === "ar" ? "غير معروف" : "Unknown";
}

function mapKnownLabel(
  map: Record<string, Record<MetadataDisplayLocale, string>>,
  value: string,
  locale: MetadataDisplayLocale
): string {
  return map[value]?.[locale] ?? value;
}

/** ISO instant → locale-aware, human-readable display (Riyadh timezone). */
export function formatCommercialOverviewTimestamp(
  iso: string | null | undefined,
  locale: MetadataDisplayLocale
): string {
  if (iso == null || String(iso).trim() === "") {
    return metadataDisplayFallback(locale, "unavailable");
  }
  const intlLocale = locale === "ar" ? "ar-SA" : "en-US";
  const formatted = formatRiyadhDateTime(iso, intlLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  if (!formatted) {
    return metadataDisplayFallback(locale, "unknown");
  }
  return formatted;
}

export function formatMetadataAuthorityValue(
  value: string | null | undefined,
  locale: MetadataDisplayLocale
): string {
  if (value == null || String(value).trim() === "") {
    return metadataDisplayFallback(locale, "unavailable");
  }
  return mapKnownLabel(AUTHORITY_LABELS, value, locale);
}

export function formatMetadataMetricsSourceValue(
  value: string | null | undefined,
  locale: MetadataDisplayLocale
): string {
  if (value == null || String(value).trim() === "") {
    return metadataDisplayFallback(locale, "unavailable");
  }
  return mapKnownLabel(METRICS_SOURCE_LABELS, value, locale);
}

export function formatMetadataSchemaVersionValue(
  value: string | null | undefined,
  locale: MetadataDisplayLocale
): string {
  if (value == null || String(value).trim() === "") {
    return metadataDisplayFallback(locale, "unavailable");
  }
  return mapKnownLabel(SCHEMA_VERSION_LABELS, value, locale);
}
