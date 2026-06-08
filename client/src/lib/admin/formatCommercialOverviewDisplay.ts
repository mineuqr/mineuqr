/**
 * EXEC-7C.3 — presentation-only formatters for CommercialOverviewSnapshot display.
 * No KPI derivation; values come from admin.getCommercialOverview as-is.
 */

/** ISO instant → locale-aware display string (UTC, LTR-safe digits). */
export function formatCommercialOverviewTimestamp(
  iso: string,
  locale: "ar" | "en"
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(d);
}
