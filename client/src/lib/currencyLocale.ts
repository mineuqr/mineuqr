/**
 * Locale-aware currency formatting for UI and Excel exports.
 * Uses Intl + ISO currency codes; avoids hardcoded per-country strings.
 */

export type AppLanguage = "ar" | "en";

export type CurrencyFormatInput = {
  language: AppLanguage | string;
  currencyCode?: string | null;
  currencySymbol?: string | null;
  decimalPlaces?: number;
};

export function normalizeAppLanguage(language: string): AppLanguage {
  return language === "ar" ? "ar" : "en";
}

/** Resolve ISO 4217 code from stored restaurant fields */
export function normalizeCurrencyCode(
  currencyCode?: string | null,
  currencySymbol?: string | null
): string | undefined {
  const code = currencyCode?.trim().toUpperCase();
  if (code && /^[A-Z]{3}$/.test(code)) return code;

  const symbol = currencySymbol?.trim();
  if (symbol && /^[A-Z]{3}$/.test(symbol)) return symbol.toUpperCase();

  return undefined;
}

function intlLocale(language: AppLanguage): string {
  return language === "ar" ? "ar" : "en";
}

function intlCurrencyUnit(
  code: string,
  language: AppLanguage,
  currencyDisplay: "code" | "narrowSymbol"
): string {
  try {
    const parts = new Intl.NumberFormat(intlLocale(language), {
      style: "currency",
      currency: code,
      currencyDisplay,
    }).formatToParts(1);
    const unit = parts.find((p) => p.type === "currency")?.value?.trim();
    if (unit) return unit;
  } catch {
    // Unknown/invalid code for runtime Intl data
  }
  return code;
}

function escapeExcelFormatLiteral(value: string): string {
  return value.replace(/"/g, '""');
}

function containsArabicScript(value: string): boolean {
  return /[\u0600-\u06FF]/.test(value);
}

/**
 * Excel number format: English → ISO code (e.g. 100.00 MAD), Arabic → local symbol (e.g. 100.00 د.م.)
 */
export function buildExcelCurrencyNumFmt(input: CurrencyFormatInput): string {
  const language = normalizeAppLanguage(input.language);
  const decimals = Math.max(0, input.decimalPlaces ?? 2);
  const decimalPart = decimals > 0 ? `.${"0".repeat(decimals)}` : "";
  const base = `#,##0${decimalPart}`;
  const code = normalizeCurrencyCode(input.currencyCode, input.currencySymbol);

  if (code) {
    const display = language === "en" ? "code" : "narrowSymbol";
    const unit = intlCurrencyUnit(code, language, display);
    return `${base} "${escapeExcelFormatLiteral(unit)}"`;
  }

  const symbol = input.currencySymbol?.trim();
  if (!symbol) return base;

  if (language === "en" && containsArabicScript(symbol)) {
    return base;
  }

  return `${base} "${escapeExcelFormatLiteral(symbol)}"`;
}

/**
 * Human-readable amount with locale-appropriate currency (UI / labels).
 */
export function formatCurrencyAmount(amount: number, input: CurrencyFormatInput): string {
  const language = normalizeAppLanguage(input.language);
  const decimals = input.decimalPlaces ?? 2;
  const code = normalizeCurrencyCode(input.currencyCode, input.currencySymbol);
  const locale = intlLocale(language);

  if (code) {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: code,
        currencyDisplay: language === "en" ? "code" : "narrowSymbol",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(amount);
    } catch {
      /* fallback below */
    }
  }

  const symbol = input.currencySymbol?.trim() ?? "";
  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  if (!symbol) return number;
  if (language === "en" && containsArabicScript(symbol)) return number;
  return `${number} ${symbol}`;
}
