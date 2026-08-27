/**
 * SETTLEMENT-RECORD-REPORTING-ADOPTION-1 — financial publication source selection.
 *
 * Modes (business metrics / dual diagnostics):
 * - settlement_record (default): Business Metrics read Settlement Record / Union
 * - dual: attach ST/SR vs published diagnostics; payment-method captured still CF∪ST
 * - check: emergency business-metrics rollback only — not tender analytics SSOT
 *
 * Payment-method captured tenders: Collection Fact.tendersJson wins; ST historical.
 */

export type FinancialReportingSourceMode =
  | "settlement_record"
  | "dual"
  | "check";

const DEFAULT_MODE: FinancialReportingSourceMode = "settlement_record";

export function resolveFinancialReportingSourceMode(
  env: NodeJS.ProcessEnv = process.env
): FinancialReportingSourceMode {
  const raw = (env.REPORTING_FINANCIAL_SOURCE ?? DEFAULT_MODE)
    .trim()
    .toLowerCase();
  if (raw === "dual" || raw === "check" || raw === "settlement_record") {
    return raw;
  }
  return DEFAULT_MODE;
}
