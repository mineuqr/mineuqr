/**
 * MULTI-COUNTRY-COMPLIANCE-LAYER-FOUNDATION-1
 * ISO 3166-1 alpha-2 normalization for compliance module routing.
 * Restaurants store countryCode as varchar(2) — uppercase ISO codes only.
 */

/** Normalize authoritative restaurant country codes for registry routing. */
export function normalizeCountryCode(
  input: string | null | undefined
): string | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length !== 2) return null;
  return trimmed.toUpperCase();
}
