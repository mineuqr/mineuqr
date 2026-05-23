/** App display timezone (Saudi Arabia). */
export const APP_TIMEZONE = "Asia/Riyadh";

/**
 * Parse DB/API timestamps stored as UTC without a Z suffix.
 * Examples: "2026-05-23 12:34:56", "2026-05-23T12:34:56.000Z"
 */
export function parseDbUtcTimestamp(
  value: string | Date | null | undefined
): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (/[zZ]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const isoLike = trimmed.includes("T")
    ? trimmed
    : trimmed.replace(" ", "T");
  const d = new Date(`${isoLike}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatRiyadhDateTime(
  value: string | Date | null | undefined,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseDbUtcTimestamp(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(locale, {
    timeZone: APP_TIMEZONE,
    ...options,
  }).format(date);
}

export function formatRiyadhDate(
  value: string | Date | null | undefined,
  locale: string
): string {
  return formatRiyadhDateTime(value, locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRiyadhTime(
  value: string | Date | null | undefined,
  locale: string
): string {
  return formatRiyadhDateTime(value, locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
