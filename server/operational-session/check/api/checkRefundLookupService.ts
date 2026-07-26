/**
 * REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2 — Settlement Number → refund lookup.
 * Transport/presentation façade helpers. No money calculation beyond domain budget.
 */

import { TRPCError } from "@trpc/server";
import {
  evaluateRefundWindow,
  parseBusinessRefundPolicyJson,
  parseRefundMoney,
  REFUND_POLICY_DISABLED_CODE,
  REFUND_WINDOW_EXPIRED_CODE,
  type BusinessRefundPolicy,
} from "@shared/operational-session";
import {
  parseSettlementOperationalIdentity,
  resolveSettlementOperationalIdentity,
} from "@shared/operational-document-identity";
import { getRestaurantById } from "../../../db";
import {
  getCheckRefundBudget,
} from "../CheckService";
import { listSettlementRecordsForCheck } from "../settlementRecordRepository";
import { toSettlementRecordHistoryItemDto } from "./settlementRecordApiMapper";

export type CheckRefundLookupDto = Readonly<{
  contractId: "REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2";
  contractVersion: 2;
  restaurantId: number;
  settlementNumber: string;
  settlementRecordId: string;
  checkId: number;
  sessionId: number | null;
  businessDay: string;
  settledAt: string | null;
  paymentMethodSummary: string;
  originalAmount: string;
  previouslyRefunded: string;
  refundableBalance: string;
  currencyCode: string;
  currencySymbol: string;
  outcome: string;
  recordKind: string;
  recordGeneration: number;
  eligible: boolean;
  customer: null;
  policy: BusinessRefundPolicy;
  window: {
    windowHours: number;
    settlementAt: string;
    elapsedMs: number;
    windowMs: number;
    expired: boolean;
    remainingMs: number;
  };
  rejectionCode:
    | typeof REFUND_WINDOW_EXPIRED_CODE
    | typeof REFUND_POLICY_DISABLED_CODE
    | "NOT_ELIGIBLE"
    | "NOT_PAID"
    | null;
}>;

function paymentMethodSummaryOf(record: {
  paymentSnapshot: readonly { paymentMethod: string }[];
  outcome: string;
}): string {
  const methods = record.paymentSnapshot.map((p) => String(p.paymentMethod));
  if (methods.length === 0) {
    return record.outcome === "complimentary" ? "complimentary" : "none";
  }
  return Array.from(new Set(methods)).join(", ");
}

export async function lookupCheckRefundBySettlementNumber(input: {
  restaurantId: number;
  settlementNumber: string;
}): Promise<CheckRefundLookupDto> {
  const parsed = parseSettlementOperationalIdentity(input.settlementNumber);
  if (!parsed) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Unknown settlement number",
    });
  }

  const restaurant = await getRestaurantById(input.restaurantId);
  if (!restaurant) {
    throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" });
  }
  const policy = parseBusinessRefundPolicyJson(
    (restaurant as { refundPolicyJson?: string | null }).refundPolicyJson
  );

  const records = await listSettlementRecordsForCheck({
    restaurantId: input.restaurantId,
    checkId: parsed.checkId,
  });
  const primary =
    records
      .filter(
        (r) =>
          r.recordKind === "settlement" &&
          (r.outcome === "paid" || r.outcome === "complimentary")
      )
      .sort((a, b) => a.recordGeneration - b.recordGeneration)[0] ?? null;

  if (!primary) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Unknown settlement number",
    });
  }

  // Prefer requested generation when it is the primary settlement publication.
  const target =
    records.find(
      (r) =>
        r.recordKind === "settlement" &&
        r.recordGeneration === parsed.recordGeneration
    ) ?? primary;

  const historyItem = toSettlementRecordHistoryItemDto(target);
  const budget = await getCheckRefundBudget({
    restaurantId: input.restaurantId,
    checkId: parsed.checkId,
  });
  const refundable = parseRefundMoney(budget.refundableBalance);
  const window = evaluateRefundWindow({
    settlementAt: primary.settledAt ?? primary.createdAt,
    windowHours: policy.windowHours,
  });

  const paidOk =
    target.outcome === "paid" || target.outcome === "complimentary";
  let rejectionCode: CheckRefundLookupDto["rejectionCode"] = null;
  if (!policy.refundEnabled) {
    rejectionCode = REFUND_POLICY_DISABLED_CODE;
  } else if (!paidOk) {
    rejectionCode = "NOT_PAID";
  } else if (window.expired) {
    rejectionCode = REFUND_WINDOW_EXPIRED_CODE;
  } else if (refundable <= 0) {
    rejectionCode = "NOT_ELIGIBLE";
  }

  const settlementNumber = resolveSettlementOperationalIdentity({
    checkId: target.checkId,
    settlementRecordId: target.settlementRecordId,
    recordGeneration: target.recordGeneration,
  });

  return {
    contractId: "REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2",
    contractVersion: 2,
    restaurantId: input.restaurantId,
    settlementNumber,
    settlementRecordId: target.settlementRecordId,
    checkId: target.checkId,
    sessionId: target.sessionId,
    businessDay: target.businessDay,
    settledAt: target.settledAt,
    paymentMethodSummary:
      historyItem.paymentMethodSummary || paymentMethodSummaryOf(target),
    originalAmount: budget.settledValue,
    previouslyRefunded: budget.appliedRefundTotal,
    refundableBalance: budget.refundableBalance,
    currencyCode: target.currencySnapshot.currencyCode,
    currencySymbol: target.currencySnapshot.currencySymbol,
    outcome: target.outcome,
    recordKind: target.recordKind,
    recordGeneration: target.recordGeneration,
    eligible: rejectionCode == null && refundable > 0,
    customer: null,
    policy,
    window: {
      windowHours: window.windowHours,
      settlementAt: window.settlementAt,
      elapsedMs: window.elapsedMs,
      windowMs: window.windowMs,
      expired: window.expired,
      remainingMs: window.remainingMs,
    },
    rejectionCode,
  };
}

export async function assertRefundPolicyAllowsApply(input: {
  restaurantId: number;
  checkId: number;
  amount: string;
  reason?: string | null;
  managerApproved?: boolean | null;
}): Promise<void> {
  const restaurant = await getRestaurantById(input.restaurantId);
  if (!restaurant) {
    throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" });
  }
  const policy = parseBusinessRefundPolicyJson(
    (restaurant as { refundPolicyJson?: string | null }).refundPolicyJson
  );
  if (!policy.refundEnabled) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: REFUND_POLICY_DISABLED_CODE,
    });
  }

  const records = await listSettlementRecordsForCheck({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
  });
  const primary = records
    .filter(
      (r) =>
        r.recordKind === "settlement" &&
        (r.outcome === "paid" || r.outcome === "complimentary")
    )
    .sort((a, b) => a.recordGeneration - b.recordGeneration)[0];
  if (!primary) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "CHECK_NOT_REFUNDABLE",
    });
  }

  const window = evaluateRefundWindow({
    settlementAt: primary.settledAt ?? primary.createdAt,
    windowHours: policy.windowHours,
  });
  if (window.expired) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: REFUND_WINDOW_EXPIRED_CODE,
    });
  }

  if (policy.requireReason && !String(input.reason ?? "").trim()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "REFUND_REASON_REQUIRED",
    });
  }
  if (policy.requireManagerApproval && input.managerApproved !== true) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "REFUND_MANAGER_APPROVAL_REQUIRED",
    });
  }

  if (!policy.partialRefundAllowed) {
    const budget = await getCheckRefundBudget({
      restaurantId: input.restaurantId,
      checkId: input.checkId,
    });
    if (parseRefundMoney(input.amount) < parseRefundMoney(budget.refundableBalance)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "PARTIAL_REFUND_NOT_ALLOWED",
      });
    }
  }
}
