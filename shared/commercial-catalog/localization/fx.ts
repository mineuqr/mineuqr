/**
 * COMMERCIAL-CATALOG-LOCALIZATION-IMPLEMENTATION-1
 * FX provider abstraction — presentation rates only.
 */

export type FxRateTable = Record<string, number>; // currency → units per 1 USD

export interface FxProvider {
  readonly id: string;
  fetchUsdRates(): Promise<FxRateTable>;
}

/** Built-in static USD-based rates (presentation fallback / offline). */
export class StaticFxProvider implements FxProvider {
  readonly id = "static";
  constructor(private readonly rates: FxRateTable = DEFAULT_USD_RATES) {}
  async fetchUsdRates(): Promise<FxRateTable> {
    return { ...this.rates, USD: 1 };
  }
}

export const DEFAULT_USD_RATES: FxRateTable = {
  USD: 1,
  SAR: 3.75,
  AED: 3.6725,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 157,
  EGP: 48.5,
  PHP: 58,
  CAD: 1.36,
  AUD: 1.52,
  CHF: 0.88,
  INR: 83,
  TRY: 32,
  KWD: 0.31,
  QAR: 3.64,
  BHD: 0.376,
  OMR: 0.385,
  JOD: 0.709,
};

export type FxServiceOptions = {
  provider: FxProvider;
  fallbackProvider?: FxProvider;
  ttlMs?: number;
  onEvent?: (event: FxObservabilityEvent) => void;
};

export type FxObservabilityEvent =
  | { type: "fx_refresh_ok"; provider: string; currencies: number }
  | { type: "fx_refresh_fail"; provider: string; error: string }
  | { type: "fx_convert"; from: string; to: string; ok: boolean }
  | { type: "fx_fallback_used"; provider: string };

export class FxService {
  private cache: { rates: FxRateTable; fetchedAt: number } | null = null;
  private readonly ttlMs: number;
  private readonly provider: FxProvider;
  private readonly fallbackProvider: FxProvider;
  private readonly onEvent?: (e: FxObservabilityEvent) => void;

  constructor(options: FxServiceOptions) {
    this.provider = options.provider;
    this.fallbackProvider =
      options.fallbackProvider ?? new StaticFxProvider();
    this.ttlMs = options.ttlMs ?? 15 * 60 * 1000;
    this.onEvent = options.onEvent;
  }

  async ensureRates(): Promise<FxRateTable> {
    const now = Date.now();
    if (this.cache && now - this.cache.fetchedAt < this.ttlMs) {
      return this.cache.rates;
    }
    try {
      const rates = await this.provider.fetchUsdRates();
      const normalized = { ...rates, USD: 1 };
      this.cache = { rates: normalized, fetchedAt: now };
      this.onEvent?.({
        type: "fx_refresh_ok",
        provider: this.provider.id,
        currencies: Object.keys(normalized).length,
      });
      return normalized;
    } catch (e) {
      this.onEvent?.({
        type: "fx_refresh_fail",
        provider: this.provider.id,
        error: e instanceof Error ? e.message : String(e),
      });
      const rates = await this.fallbackProvider.fetchUsdRates();
      this.cache = { rates: { USD: 1, ...rates }, fetchedAt: now };
      this.onEvent?.({
        type: "fx_fallback_used",
        provider: this.fallbackProvider.id,
      });
      return this.cache.rates;
    }
  }

  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number | null> {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    if (from === to) {
      this.onEvent?.({ type: "fx_convert", from, to, ok: true });
      return amount;
    }
    const rates = await this.ensureRates();
    const fromRate = rates[from];
    const toRate = rates[to];
    if (fromRate == null || toRate == null || fromRate === 0) {
      this.onEvent?.({ type: "fx_convert", from, to, ok: false });
      return null;
    }
    const usd = amount / fromRate;
    const out = usd * toRate;
    this.onEvent?.({ type: "fx_convert", from, to, ok: true });
    return out;
  }

  /** Sync convert using last cache or static defaults (client-safe helper). */
  convertSync(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    rates: FxRateTable = DEFAULT_USD_RATES
  ): number | null {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    if (from === to) return amount;
    const table: FxRateTable = { USD: 1, ...rates };
    const fromRate = table[from];
    const toRate = table[to];
    if (fromRate == null || toRate == null || fromRate === 0) return null;
    return (amount / fromRate) * toRate;
  }
}

let singleton: FxService | null = null;

export function getFxService(): FxService {
  if (!singleton) {
    singleton = new FxService({
      provider: new StaticFxProvider(),
      fallbackProvider: new StaticFxProvider(),
    });
  }
  return singleton;
}

export function setFxServiceForTests(service: FxService | null) {
  singleton = service;
}
