/**
 * COMMERCIAL-CATALOG-LOCALIZATION-IMPLEMENTATION-1
 * Country → default display currency (presentation only).
 */

const COUNTRY_CURRENCY: Record<string, string> = {
  US: "USD",
  SA: "SAR",
  AE: "AED",
  EG: "EGP",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  AT: "EUR",
  BE: "EUR",
  IE: "EUR",
  PT: "EUR",
  GB: "GBP",
  JP: "JPY",
  KR: "KRW",
  IN: "INR",
  PH: "PHP",
  TR: "TRY",
  CA: "CAD",
  AU: "AUD",
  NZ: "NZD",
  CH: "CHF",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  BR: "BRL",
  MX: "MXN",
  SG: "SGD",
  MY: "MYR",
  ID: "IDR",
  TH: "THB",
  ZA: "ZAR",
  KW: "KWD",
  BH: "BHD",
  QA: "QAR",
  OM: "OMR",
  JO: "JOD",
  LB: "LBP",
  IQ: "IQD",
  MA: "MAD",
  TN: "TND",
  DZ: "DZD",
  PK: "PKR",
  BD: "BDT",
  CN: "CNY",
  HK: "HKD",
  TW: "TWD",
  RU: "RUB",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  IL: "ILS",
};

export function defaultCurrencyForCountry(countryCode: string): string {
  const cc = (countryCode || "US").trim().toUpperCase();
  return COUNTRY_CURRENCY[cc] ?? "USD";
}

export function normalizeCountryCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cc = raw.trim().toUpperCase();
  if (cc === "XX" || cc === "T1" || cc.length !== 2) return null;
  if (!/^[A-Z]{2}$/.test(cc)) return null;
  return cc;
}
