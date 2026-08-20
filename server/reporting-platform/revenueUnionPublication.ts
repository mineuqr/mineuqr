/**
 * REVENUE-UNION-PUBLISHED-ADOPTION-1 — published Revenue pipeline source.
 *
 * Modes:
 * - published (default / cutover): Business Metrics resolve through Revenue Union
 *   with published Collection Fact eligibility (currently empty allowlist).
 * - legacy: previous Settlement Record aggregator only (reporting rollback).
 *
 * Rollback does not delete Collection Facts or rewrite financial history.
 */

export type RevenueUnionPublicationMode = "published" | "legacy";

const DEFAULT_MODE: RevenueUnionPublicationMode = "published";

export function resolveRevenueUnionPublicationMode(
  env: NodeJS.ProcessEnv = process.env
): RevenueUnionPublicationMode {
  const raw = (env.REPORTING_REVENUE_UNION ?? DEFAULT_MODE).trim().toLowerCase();
  if (raw === "legacy" || raw === "published") {
    return raw;
  }
  return DEFAULT_MODE;
}
