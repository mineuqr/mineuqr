/**
 * COMMERCIAL-CATALOG-LOCALIZATION-IMPLEMENTATION-1
 * Visitor country resolution — language MUST NOT determine country.
 */

import type { CountryDetectionSource } from "./types";
import { normalizeCountryCode } from "./countryCurrency";

export type ResolveVisitorCountryInput = {
  manualCountry?: string | null;
  cloudflareCountry?: string | null;
  geoIpCountry?: string | null;
};

export type ResolveVisitorCountryResult = {
  countryCode: string;
  source: CountryDetectionSource;
};

/**
 * Priority: Manual → Cloudflare CF-IPCountry → GeoIP → United States.
 */
export function resolveVisitorCountry(
  input: ResolveVisitorCountryInput
): ResolveVisitorCountryResult {
  const manual = normalizeCountryCode(input.manualCountry);
  if (manual) return { countryCode: manual, source: "manual" };

  const cf = normalizeCountryCode(input.cloudflareCountry);
  if (cf) return { countryCode: cf, source: "cloudflare" };

  const geo = normalizeCountryCode(input.geoIpCountry);
  if (geo) return { countryCode: geo, source: "geoip" };

  return { countryCode: "US", source: "default_us" };
}
