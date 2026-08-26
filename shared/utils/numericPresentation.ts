/**
 * GLOBAL-NUMERIC-PRESENTATION-POLICY-1
 *
 * Official MineuQR numeric presentation policy:
 * - Text remains localized (Arabic / English)
 * - All numeric glyphs use Western digits 0–9
 * - Arabic decimal ٫ → . and thousands ٬ → ,
 *
 * Presentation only. No business / domain logic.
 */

export const WESTERN_NUMBERING_SYSTEM = "latn" as const;

const EASTERN_ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const EXTENDED_ARABIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/**
 * Convert Eastern/Persian digits to Western 0–9.
 * Also normalizes Arabic decimal (٫) and thousands (٬) separators.
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

/** Merge Intl options so Western digits always win. */
export function withWesternDigitsIntlOptions(
  options?: Intl.NumberFormatOptions
): Intl.NumberFormatOptions;
export function withWesternDigitsIntlOptions(
  options?: Intl.DateTimeFormatOptions
): Intl.DateTimeFormatOptions;
export function withWesternDigitsIntlOptions(
  options?: Intl.NumberFormatOptions | Intl.DateTimeFormatOptions
): Intl.NumberFormatOptions | Intl.DateTimeFormatOptions {
  return {
    ...options,
    numberingSystem: WESTERN_NUMBERING_SYSTEM,
  };
}

/** Locale-aware number formatting forced to Western digits. */
export function formatLocaleNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  try {
    return toWesternDigits(
      new Intl.NumberFormat(
        locale,
        withWesternDigitsIntlOptions(options)
      ).format(value)
    );
  } catch {
    return toWesternDigits(String(value));
  }
}

/** Locale-aware date formatting forced to Western digits. */
export function formatLocaleDateTime(
  value: Date | string | number,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return toWesternDigits(
      new Intl.DateTimeFormat(
        locale,
        withWesternDigitsIntlOptions(options)
      ).format(date)
    );
  } catch {
    return toWesternDigits(date.toISOString());
  }
}
