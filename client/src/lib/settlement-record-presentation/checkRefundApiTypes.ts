/**
 * REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 — client types for checkRefund.* façade.
 */

export type CheckRefundBudgetApiDto = Readonly<{
  contractId: "REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1";
  contractVersion: 1;
  restaurantId: number;
  checkId: number;
  settledValue: string;
  appliedRefundTotal: string;
  refundableBalance: string;
  priorSettlementRecordId: string;
  nextRecordGeneration: number;
  eligible: boolean;
}>;

export type CheckRefundApplyResultApiDto = Readonly<{
  contractId: "REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1";
  contractVersion: 1;
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
