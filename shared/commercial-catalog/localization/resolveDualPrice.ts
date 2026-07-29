/**
 * COMMERCIAL-CATALOG-LOCALIZATION-IMPLEMENTATION-1
 * Dual currency presentation resolver (override → FX → USD).
 * Presentation only — does not mutate Catalog facts.
 */

import { COMMERCIAL_CANONICAL_CURRENCY } from "./types";
import type {
  CurrencyDisplaySource,
  DualPricePresentation,
  PriceRowInput,
  RegionRowInput,
} from "./types";
import { defaultCurrencyForCountry } from "./countryCurrency";

export type FxConvertFn = (
  amount: number,
  fromCurrency: string,
  toCurrency: string
) => number | null;

function parseAmount(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function roundMoney(n: number, currency: string): string {
  const decimals = currency.toUpperCase() === "JPY" ? 0 : 2;
  return n.toFixed(decimals);
}

function findCanonicalUsd(prices: PriceRowInput[]): {
  amount: number;
  fromStoredUsd: boolean;
} | null {
  const usdGlobal = prices.find(
    (p) =>
      p.currency.toUpperCase() === COMMERCIAL_CANONICAL_CURRENCY &&
      (p.regionId == null || p.regionId === "")
  );
  if (usdGlobal) {
    const n = parseAmount(usdGlobal.amount);
    if (n != null) return { amount: n, fromStoredUsd: true };
  }
  const anyUsd = prices.find(
    (p) => p.currency.toUpperCase() === COMMERCIAL_CANONICAL_CURRENCY
  );
  if (anyUsd) {
    const n = parseAmount(anyUsd.amount);
    if (n != null) return { amount: n, fromStoredUsd: true };
  }
  return null;
}

/**
 * Resolve dual presentation for a visitor country.
 * When only non-USD rows exist (legacy, no migration), convert to USD for the
 * canonical display slot via FX — never writes back to Catalog.
 */
export function resolveDualPricePresentation(input: {
  prices: PriceRowInput[];
  regions: RegionRowInput[];
  countryCode: string;
  convert: FxConvertFn;
  countrySource?: DualPricePresentation["countrySource"];
}): DualPricePresentation {
  const countryCode = (input.countryCode || "US").toUpperCase();
  const displayCurrency = defaultCurrencyForCountry(countryCode);

  const regionForCountry = input.regions.find(
    (r) => r.countryCode.toUpperCase() === countryCode
  );

  const overridePrice =
    regionForCountry != null
      ? input.prices.find((p) => p.regionId === regionForCountry.id)
      : undefined;

  let canonicalAmountNum: number | null = null;
  const storedUsd = findCanonicalUsd(input.prices);
  if (storedUsd) {
    canonicalAmountNum = storedUsd.amount;
  } else if (input.prices[0]) {
    const first = input.prices[0];
    const n = parseAmount(first.amount);
    if (n != null) {
      if (first.currency.toUpperCase() === COMMERCIAL_CANONICAL_CURRENCY) {
        canonicalAmountNum = n;
      } else {
        canonicalAmountNum = input.convert(
          n,
          first.currency.toUpperCase(),
          COMMERCIAL_CANONICAL_CURRENCY
        );
      }
    }
  }

  if (canonicalAmountNum == null) {
    return {
      canonicalCurrency: COMMERCIAL_CANONICAL_CURRENCY,
      canonicalAmount: "0",
      localCurrency: displayCurrency,
      localAmount: "0",
      localIsApproximate: true,
      currencySource: "usd_fallback",
      countryCode,
      countrySource: input.countrySource,
    };
  }

  let localCurrency = displayCurrency;
  let localAmountNum: number | null = null;
  let currencySource: CurrencyDisplaySource = "usd_fallback";
  let localIsApproximate = true;

  if (overridePrice) {
    const n = parseAmount(overridePrice.amount);
    if (n != null) {
      localAmountNum = n;
      localCurrency = overridePrice.currency.toUpperCase();
      currencySource = "regional_override";
      localIsApproximate = false;
    }
  }

  if (localAmountNum == null) {
    if (displayCurrency === COMMERCIAL_CANONICAL_CURRENCY) {
      localAmountNum = canonicalAmountNum;
      localCurrency = COMMERCIAL_CANONICAL_CURRENCY;
      currencySource = "usd_fallback";
      localIsApproximate = false;
    } else {
      const converted = input.convert(
        canonicalAmountNum,
        COMMERCIAL_CANONICAL_CURRENCY,
        displayCurrency
      );
      if (converted != null) {
        localAmountNum = converted;
        localCurrency = displayCurrency;
        currencySource = "fx";
        localIsApproximate = true;
      } else {
        localAmountNum = canonicalAmountNum;
        localCurrency = COMMERCIAL_CANONICAL_CURRENCY;
        currencySource = "usd_fallback";
        localIsApproximate = false;
      }
    }
  }

  return {
    canonicalCurrency: COMMERCIAL_CANONICAL_CURRENCY,
    canonicalAmount: roundMoney(
      canonicalAmountNum,
      COMMERCIAL_CANONICAL_CURRENCY
    ),
    localCurrency,
    localAmount: roundMoney(localAmountNum, localCurrency),
    localIsApproximate,
    currencySource,
    countryCode,
    countrySource: input.countrySource,
  };
}
