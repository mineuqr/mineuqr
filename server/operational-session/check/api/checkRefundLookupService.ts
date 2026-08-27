/**
 * REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2 — Settlement Number → refund lookup.
 * Transport/presentation façade helpers. No money calculation beyond domain budget.
 */

import { TRPCError } from "@trpc/server";
import {
  evaluateRefundWindow,
  isCollectionFactRefundAnchor,
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
import { findCheckById } from "../checkRepository";
import { mapRowToOperationalCheck } from "../checkMapper";
import { listSettlementRecordsForCheck } from "../settlementRecordRepository";
import { toSettlementRecordHistoryItemDto } from "./settlementRecordApiMapper";
import { resolveRefundOriginalSaleAnchorForCheck } from "../checkRefundOriginalSaleResolution";

export type CheckRefundLookupDto = Readonly<{
  contractId: "REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2";
  contractVersion: 2;
  restaurantId: number;
  settlementNumber: string;
  /**
   * Origin settlement document when gen=1 SR exists.
   * Null for CF-backed sales that have no primary settlement document yet.
   */
  settlementRecordId: string | null;
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

function paymentMethodSummaryFromTenders(
  tenders: readonly { paymentMethod: string }[]
): string {
  const methods = tenders.map((t) => String(t.paymentMethod));
  if (methods.length === 0) return "none";
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

  const originalSale = await resolveRefundOriginalSaleAnchorForCheck({
    restaurantId: input.restaurantId,
    checkId: parsed.checkId,
  });
  const cfAnchor = isCollectionFactRefundAnchor(originalSale)
    ? originalSale
    : null;

  const checkRow = await findCheckById(parsed.checkId);
  const check =
    checkRow && checkRow.restaurantId === input.restaurantId
      ? mapRowToOperationalCheck(checkRow)
      : null;

  // ST- is Check identity. Gen=1 SR is a document, not original-sale identity.
  // CF-backed paid/complimentary Checks may be looked up without a primary SR.
  if (!primary && !cfAnchor) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Unknown settlement number",
    });
  }
  if (!primary && !check) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Unknown settlement number",
    });
  }

  // Prefer requested generation when it is the primary settlement publication.
  const target = primary
    ? records.find(
        (r) =>
          r.recordKind === "settlement" &&
          r.recordGeneration === parsed.recordGeneration
      ) ?? primary
    : null;

  const budget = await getCheckRefundBudget({
    restaurantId: input.restaurantId,
    checkId: parsed.checkId,
  });
  const refundable = parseRefundMoney(budget.refundableBalance);
  const settlementAt = cfAnchor
    ? cfAnchor.committedAt
    : (primary?.settledAt ?? primary?.createdAt ?? check?.settledAt ?? "");
  const window = evaluateRefundWindow({
    settlementAt,
    windowHours: policy.windowHours,
  });

  const checkRefundable =
    check?.outcome === "paid" || check?.outcome === "complimentary";
  const paidOk = target
    ? cfAnchor
      ? true
      : target.outcome === "paid" || target.outcome === "complimentary"
    : checkRefundable;
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

  const checkId = target?.checkId ?? check?.id;
  if (checkId == null) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Unknown settlement number",
    });
  }
  const currencySnapshot =
    target?.currencySnapshot ?? check?.currencySnapshot;
  if (!currencySnapshot) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Unknown settlement number",
    });
  }
  const settlementNumber = resolveSettlementOperationalIdentity({
    checkId,
    settlementRecordId: target?.settlementRecordId ?? null,
    recordGeneration: target?.recordGeneration ?? 1,
  });

  const historyItem = target
    ? toSettlementRecordHistoryItemDto(target)
    : null;
  const paymentMethodSummary = cfAnchor
    ? paymentMethodSummaryFromTenders(cfAnchor.tenders)
    : historyItem?.paymentMethodSummary ||
      paymentMethodSummaryFromTenders(target?.paymentSnapshot ?? []);

  return {
    contractId: "REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2",
    contractVersion: 2,
    restaurantId: input.restaurantId,
    settlementNumber,
    settlementRecordId: target?.settlementRecordId ?? null,
    checkId,
    sessionId: target?.sessionId ?? check?.sessionId ?? null,
    businessDay: cfAnchor?.businessDay ?? target?.businessDay ?? "",
    settledAt: cfAnchor?.committedAt ?? target?.settledAt ?? check?.settledAt ?? null,
    paymentMethodSummary,
    originalAmount: budget.settledValue,
    previouslyRefunded: budget.appliedRefundTotal,
    refundableBalance: budget.refundableBalance,
    currencyCode: currencySnapshot.currencyCode,
    currencySymbol: currencySnapshot.currencySymbol,
    outcome: target?.outcome ?? check?.outcome ?? "paid",
    recordKind: target?.recordKind ?? "settlement",
    recordGeneration: target?.recordGeneration ?? 1,
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
  const originalSale = await resolveRefundOriginalSaleAnchorForCheck({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
  });
  const cfAnchor = isCollectionFactRefundAnchor(originalSale)
    ? originalSale
    : null;
  if (!primary && !cfAnchor) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "CHECK_NOT_REFUNDABLE",
    });
  }

  const settlementAt = cfAnchor
    ? cfAnchor.committedAt
    : (primary?.settledAt ?? primary?.createdAt ?? "");
  const window = evaluateRefundWindow({
    settlementAt,
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
