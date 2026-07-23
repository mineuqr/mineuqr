/**
 * SETTLEMENT-RECORD-REPORTING-ADOPTION-1 — financial publication source selection.
 *
 * Modes:
 * - settlement_record (default / cutover): Reporting reads Settlement Record only
 * - dual: compute Check/ST + SR, return SR when parity matches else SR still
 *   returned as canonical with parity attached for diagnostics
 * - check: legacy (tests / emergency rollback only)
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
