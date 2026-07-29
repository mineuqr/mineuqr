/**
 * COMMERCIAL-CATALOG-LOCALIZATION-IMPLEMENTATION-1
 * Presentation-only commercial localization (no Catalog domain mutation).
 */

export const COMMERCIAL_CATALOG_LOCALIZATION_PROGRAM =
  "COMMERCIAL-CATALOG-LOCALIZATION-IMPLEMENTATION-1" as const;

export const COMMERCIAL_CANONICAL_CURRENCY = "USD" as const;

export type CommercialCanonicalCurrency =
  typeof COMMERCIAL_CANONICAL_CURRENCY;

/** Preview markets for admin localized preview (read-only). */
export const ADMIN_LOCALIZATION_PREVIEW_MARKETS = [
  { countryCode: "SA", currency: "SAR", labelKey: "markets.sa" },
  { countryCode: "DE", currency: "EUR", labelKey: "markets.de" },
  { countryCode: "US", currency: "USD", labelKey: "markets.us" },
  { countryCode: "JP", currency: "JPY", labelKey: "markets.jp" },
  { countryCode: "GB", currency: "GBP", labelKey: "markets.gb" },
] as const;

export type CountryDetectionSource =
  | "manual"
  | "cloudflare"
  | "geoip"
  | "default_us";

export type CurrencyDisplaySource =
  | "regional_override"
  | "fx"
  | "usd_fallback";

export type DualPricePresentation = {
  canonicalCurrency: typeof COMMERCIAL_CANONICAL_CURRENCY;
  canonicalAmount: string;
  localCurrency: string;
  localAmount: string;
  localIsApproximate: boolean;
  currencySource: CurrencyDisplaySource;
  countryCode: string;
  countrySource?: CountryDetectionSource;
};

export type PriceRowInput = {
  amount: string;
  currency: string;
  regionId?: string | null;
};

export type RegionRowInput = {
  id: string;
  countryCode: string;
  currency: string;
};
