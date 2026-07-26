/**
 * REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 — transport DTOs for Check Refund façade.
 * Serialization only — values come from CheckService / domain results.
 */

export const CHECK_REFUND_API_CONTRACT_ID =
  "REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1" as const;
export const CHECK_REFUND_API_CONTRACT_VERSION = 1 as const;

export type CheckRefundBudgetDto = Readonly<{
  contractId: typeof CHECK_REFUND_API_CONTRACT_ID;
  contractVersion: typeof CHECK_REFUND_API_CONTRACT_VERSION;
  restaurantId: number;
  checkId: number;
  settledValue: string;
  appliedRefundTotal: string;
  refundableBalance: string;
  priorSettlementRecordId: string;
  nextRecordGeneration: number;
  /** Domain-derived: refundableBalance > 0. */
  eligible: boolean;
}>;

export type CheckRefundApplyResultDto = Readonly<{
  contractId: typeof CHECK_REFUND_API_CONTRACT_ID;
  contractVersion: typeof CHECK_REFUND_API_CONTRACT_VERSION;
  restaurantId: number;
  checkId: number;
  outcome: "applied" | "already_applied";
  refundableBalanceRemaining: string;
  settledValue: string;
  appliedRefundTotal: string;
  settlementRecordId: string | null;
  recordGeneration: number | null;
  recordKind: string | null;
}>;
