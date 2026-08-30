/**
 * REFUND-INVOICE-IDENTITY-AND-CONCURRENCY-HARDENING-1
 * Primary human-facing Refund lookup: Original Cashier Invoice Number.
 * Secondary/legacy: Settlement Number (ST-…).
 * Money authority unchanged — budget still CF preferred / legacy SR.
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
import {
  formatCashierInvoiceNumber,
  parseCashierInvoiceNumber,
} from "@shared/pos";
import { getRestaurantById } from "../../../db";
import { findCashierInvoiceBySequenceNumber } from "../../../pos/cashier-invoice/cashierInvoiceRepository";
import { getCheckRefundBudget } from "../CheckService";
import { findCheckById } from "../checkRepository";
import { mapRowToOperationalCheck } from "../checkMapper";
import { listFinanciallyCompleteMembershipsForOrder } from "../checkOrderMembershipRepository";
import { listSettlementRecordsForCheck } from "../settlementRecordRepository";
import { toSettlementRecordHistoryItemDto } from "./settlementRecordApiMapper";
import { resolveRefundOriginalSaleAnchorForCheck } from "../checkRefundOriginalSaleResolution";

export type CheckRefundLookupDto = Readonly<{
  contractId: "REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2";
  contractVersion: 2;
  restaurantId: number;
  /** Primary human-facing sale reference when known. */
  invoiceNumber: string | null;
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

async function buildCheckRefundLookupDto(input: {
  restaurantId: number;
  checkId: number;
  invoiceNumber: string | null;
  /** Preferred settlement generation when looking up ST-…-N. */
  preferredRecordGeneration?: number;
}): Promise<CheckRefundLookupDto> {
  const restaurant = await getRestaurantById(input.restaurantId);
  if (!restaurant) {
    throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" });
  }
  const policy = parseBusinessRefundPolicyJson(
    (restaurant as { refundPolicyJson?: string | null }).refundPolicyJson
  );

  const records = await listSettlementRecordsForCheck({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
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
    checkId: input.checkId,
  });
  const cfAnchor = isCollectionFactRefundAnchor(originalSale)
    ? originalSale
    : null;

  const checkRow = await findCheckById(input.checkId);
  const check =
    checkRow && checkRow.restaurantId === input.restaurantId
      ? mapRowToOperationalCheck(checkRow)
      : null;

  if (!primary && !cfAnchor) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Unknown refund sale",
    });
  }
  if (!primary && !check) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Unknown refund sale",
    });
  }

  const target = primary
    ? input.preferredRecordGeneration != null
      ? (records.find(
          (r) =>
            r.recordKind === "settlement" &&
            r.recordGeneration === input.preferredRecordGeneration
        ) ?? primary)
      : primary
    : null;
  const budget = await getCheckRefundBudget({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
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
      message: "Unknown refund sale",
    });
  }
  const currencySnapshot =
    target?.currencySnapshot ?? check?.currencySnapshot;
  if (!currencySnapshot) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Unknown refund sale",
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
    invoiceNumber: input.invoiceNumber,
    settlementNumber,
    settlementRecordId: target?.settlementRecordId ?? null,
    checkId,
    sessionId: target?.sessionId ?? check?.sessionId ?? null,
    businessDay: cfAnchor?.businessDay ?? target?.businessDay ?? "",
    settledAt:
      cfAnchor?.committedAt ?? target?.settledAt ?? check?.settledAt ?? null,
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

/**
 * Primary Refund sale lookup: Original Cashier Invoice Number → Order → Check → budget.
 */
export async function lookupCheckRefundByInvoiceNumber(input: {
  restaurantId: number;
  invoiceNumber: string;
}): Promise<CheckRefundLookupDto> {
  const sequenceNumber = parseCashierInvoiceNumber(input.invoiceNumber);
  if (sequenceNumber == null) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Unknown invoice number",
    });
  }

  const invoice = await findCashierInvoiceBySequenceNumber({
    restaurantId: input.restaurantId,
    sequenceNumber,
  });
  if (!invoice) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Unknown invoice number",
    });
  }

  const memberships = await listFinanciallyCompleteMembershipsForOrder(
    input.restaurantId,
    invoice.orderId
  );
  if (memberships.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Unknown invoice number",
    });
  }
  if (memberships.length > 1) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Ambiguous invoice check membership",
    });
  }

  const checkId = memberships[0]!.membership.checkId;
  return buildCheckRefundLookupDto({
    restaurantId: input.restaurantId,
    checkId,
    invoiceNumber: formatCashierInvoiceNumber(invoice.sequenceNumber),
  });
}

/**
 * Legacy / secondary lookup by Settlement Operational Identity (ST-…).
 * Bare digits are NOT accepted here — Invoice is the primary digit identity.
 */
export async function lookupCheckRefundBySettlementNumber(input: {
  restaurantId: number;
  settlementNumber: string;
}): Promise<CheckRefundLookupDto> {
  const raw = input.settlementNumber.trim();
  // Bare digits belong to Invoice identity — do not interpret as Check id.
  if (/^\d{1,12}$/.test(raw)) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Unknown settlement number",
    });
  }

  const parsed = parseSettlementOperationalIdentity(raw);
  if (!parsed || !/^ST-/i.test(raw)) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Unknown settlement number",
    });
  }

  return buildCheckRefundLookupDto({
    restaurantId: input.restaurantId,
    checkId: parsed.checkId,
    invoiceNumber: null,
    preferredRecordGeneration: parsed.recordGeneration,
  });
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
    if (
      parseRefundMoney(input.amount) < parseRefundMoney(budget.refundableBalance)
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "PARTIAL_REFUND_NOT_ALLOWED",
      });
    }
  }
}
