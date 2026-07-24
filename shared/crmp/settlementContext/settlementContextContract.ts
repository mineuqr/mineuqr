/**
 * SETTLEMENT-CONTEXT-ADOPTION-1 / ADR-ARCH-030 — Settlement Context contract.
 *
 * Operational context carrier for settle pipelines. Never owns money.
 * Never fabricates Register or Financial Shift.
 */

export const SETTLEMENT_CONTEXT_PROGRAM_ID = "SETTLEMENT-CONTEXT-ADOPTION-1" as const;

export const SETTLEMENT_CONTEXT_RESOLUTION_STATUSES = [
  "resolved",
  "partial",
  "unavailable",
] as const;

export type SettlementContextResolutionStatus =
  (typeof SETTLEMENT_CONTEXT_RESOLUTION_STATUSES)[number];

/**
 * Hints supplied by the settle caller. All optional — settlement is fail-open
 * when hints or CRMP facts are missing (ADR-ARCH-030).
 */
export type SettlementContextHints = Readonly<{
  registerId?: string | null;
  deviceId?: string | null;
  operatorUserId?: number | null;
  operationalScreenId?: string | null;
}>;

/**
 * Canonical Settlement Context — travels with settle; does not create financial facts.
 *
 * Required: restaurantId, resolvedAt, status, gaps
 * Optional refs: register / shift / operator / device / screen (null when unresolved)
 */
export type SettlementContext = Readonly<{
  restaurantId: number;
  registerId: string | null;
  financialShiftId: string | null;
  operatorUserId: number | null;
  deviceId: string | null;
  operationalScreenId: string | null;
  resolvedAt: string;
  status: SettlementContextResolutionStatus;
  /** Explicit gap codes — never blocks Check settle */
  gaps: readonly string[];
}>;

export function unavailableSettlementContext(
  restaurantId: number,
  resolvedAt: string,
  gaps: readonly string[] = ["context_unavailable"]
): SettlementContext {
  return {
    restaurantId,
    registerId: null,
    financialShiftId: null,
    operatorUserId: null,
    deviceId: null,
    operationalScreenId: null,
    resolvedAt,
    status: "unavailable",
    gaps: [...gaps],
  };
}
