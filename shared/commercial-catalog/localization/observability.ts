/**
 * COMMERCIAL-CATALOG-LOCALIZATION-IMPLEMENTATION-1
 * In-memory localization observability (presentation).
 */

import type {
  CountryDetectionSource,
  CurrencyDisplaySource,
} from "./types";

export type LocalizationObservabilitySnapshot = {
  detectedCountry: string | null;
  countrySource: CountryDetectionSource | null;
  currencySource: CurrencyDisplaySource | null;
  overrideUsage: number;
  fxUsage: number;
  localizationFailures: number;
  countryDetectionFailures: number;
  fxFailures: number;
  missingTranslations: number;
  rtlUsage: number;
  lastLanguage: string | null;
};

const state: LocalizationObservabilitySnapshot = {
  detectedCountry: null,
  countrySource: null,
  currencySource: null,
  overrideUsage: 0,
  fxUsage: 0,
  localizationFailures: 0,
  countryDetectionFailures: 0,
  fxFailures: 0,
  missingTranslations: 0,
  rtlUsage: 0,
  lastLanguage: null,
};

export const commercialLocalizationObservability = {
  recordCountry(countryCode: string, source: CountryDetectionSource) {
    state.detectedCountry = countryCode;
    state.countrySource = source;
    if (source === "default_us") {
      /* default is success path, not failure */
    }
  },
  recordCountryDetectionFailure() {
    state.countryDetectionFailures += 1;
  },
  recordCurrencySource(source: CurrencyDisplaySource) {
    state.currencySource = source;
    if (source === "regional_override") state.overrideUsage += 1;
    if (source === "fx") state.fxUsage += 1;
  },
  recordFxFailure() {
    state.fxFailures += 1;
  },
  recordLocalizationFailure() {
    state.localizationFailures += 1;
  },
  recordMissingTranslation() {
    state.missingTranslations += 1;
  },
  recordLanguage(language: string, rtl: boolean) {
    state.lastLanguage = language;
    if (rtl) state.rtlUsage += 1;
  },
  snapshot(): LocalizationObservabilitySnapshot {
    return { ...state };
  },
  resetForTests() {
    state.detectedCountry = null;
    state.countrySource = null;
    state.currencySource = null;
    state.overrideUsage = 0;
    state.fxUsage = 0;
    state.localizationFailures = 0;
    state.countryDetectionFailures = 0;
    state.fxFailures = 0;
    state.missingTranslations = 0;
    state.rtlUsage = 0;
    state.lastLanguage = null;
  },
};
