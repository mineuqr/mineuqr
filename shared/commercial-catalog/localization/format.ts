/**
 * COMMERCIAL-CATALOG-LOCALIZATION-IMPLEMENTATION-1
 * Locale-aware formatting via Intl only (no custom separators).
 */

export function formatCommercialNumber(
  value: number | string,
  locale: string
): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat(locale).format(n);
}

export function formatCommercialPercent(
  value: number,
  locale: string,
  fractionDigits = 0
): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatCommercialDate(
  value: string | number | Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat(
    locale,
    options ?? { dateStyle: "medium", timeStyle: "short" }
  ).format(d);
}

export function formatCommercialCurrency(
  amount: number | string,
  currency: string,
  locale: string
): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const code = (currency || "USD").toUpperCase();
  if (!Number.isFinite(n)) return `${amount} ${code}`;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      currencyDisplay: "symbol",
    }).format(n);
  } catch {
    return `${formatCommercialNumber(n, locale)} ${code}`;
  }
}

export function localeFromLanguage(language: string): string {
  if (language === "ar") return "ar";
  if (language === "en") return "en-US";
  return language || "en-US";
}
