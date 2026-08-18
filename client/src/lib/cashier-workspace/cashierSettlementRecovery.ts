/**
 * CASHIER-SETTLEMENT-UNKNOWN-RESULT-RECOVERY-1
 * Read-only rediscovery of durable Check / Settlement Record truth.
 * Not a settlement command. Not client financial math. Not a second Paid UI.
 */

import type { SelectablePaymentMethod } from "@shared/operational-session";
import { SELECTABLE_PAYMENT_METHODS } from "@shared/operational-session";

export type CashierRecoveredPaidResult = {
  checkId: number;
  orderId: number;
  grandTotal: string;
  settlementRecordId: string | null;
  paymentMethod: SelectablePaymentMethod;
  settlements: readonly {
    paymentMethod: SelectablePaymentMethod;
    amount?: string;
  }[];
};

export type CashierCheckRecoveryView = {
  checkId: number;
  orderId: number;
  restaurantId: number;
  outcome: string;
  grandTotal: string;
};

export type CashierSettlementRecordRecoveryView = {
  settlementRecordId: string;
  checkId: number;
  recordKind: string;
  recordGeneration: number;
  outcome?: string;
  orderIds: readonly number[];
  paymentMethods: readonly {
    paymentMethod: string;
    amount: string;
  }[];
};

export type CashierSettlementPresentationHint = {
  paymentMethod: SelectablePaymentMethod;
  settlements: readonly {
    paymentMethod: SelectablePaymentMethod;
    amount?: string;
  }[];
};

export type CashierSettlementRecoveryResult =
  | { kind: "RECOVERY_NOT_NEEDED" }
  | {
      kind: "PAYMENT_CONFIRMED";
      paid: CashierRecoveredPaidResult;
    }
  | {
      kind: "PAYMENT_CONFIRMED_RECEIPT_INCOMPLETE";
      paid: CashierRecoveredPaidResult;
    }
  | {
      kind: "PAYMENT_NOT_CONFIRMED";
      reason: "open" | "complimentary" | "voided" | "missing";
    }
  | { kind: "PAYMENT_UNKNOWN"; reason: "check_read_failed" }
  | { kind: "RECOVERY_FAILED"; reason: "sr_read_failed" | "invalid_check" };

export function evaluateRecoveredCheckOutcome(input: {
  restaurantId: number;
  orderId: number;
  check: CashierCheckRecoveryView | null;
}):
  | { status: "paid"; check: CashierCheckRecoveryView }
  | { status: "open" }
  | { status: "complimentary" }
  | { status: "voided" }
  | { status: "missing" }
  | { status: "invalid" } {
  const check = input.check;
  if (!check) return { status: "missing" };
  if (check.restaurantId !== input.restaurantId) return { status: "invalid" };
  if (check.orderId !== input.orderId) return { status: "invalid" };
  if (check.outcome === "paid") return { status: "paid", check };
  if (check.outcome === "open") return { status: "open" };
  if (check.outcome === "complimentary") return { status: "complimentary" };
  if (check.outcome === "voided") return { status: "voided" };
  return { status: "invalid" };
}

export function selectCanonicalSettlementRecord(
  records: readonly CashierSettlementRecordRecoveryView[],
  input: { checkId: number; orderId: number }
): CashierSettlementRecordRecoveryView | null {
  const kindMatches = records.filter(
    (record) =>
      record.recordKind === "settlement" && record.checkId === input.checkId
  );
  const withOrder = kindMatches.filter(
    (record) =>
      record.orderIds.length === 0 || record.orderIds.includes(input.orderId)
  );
  const pool = withOrder.length > 0 ? withOrder : kindMatches;
  if (pool.length === 0) return null;
  return [...pool].sort(
    (a, b) => a.recordGeneration - b.recordGeneration
  )[0]!;
}

function isSelectablePaymentMethod(
  value: string
): value is SelectablePaymentMethod {
  return (SELECTABLE_PAYMENT_METHODS as readonly string[]).includes(value);
}

export function presentationFromSettlementRecord(
  record: CashierSettlementRecordRecoveryView,
  hint?: CashierSettlementPresentationHint
): Pick<CashierRecoveredPaidResult, "paymentMethod" | "settlements"> {
  const selectable = record.paymentMethods.filter((line) =>
    isSelectablePaymentMethod(line.paymentMethod)
  );
  if (selectable.length > 0) {
    const settlements = selectable.map((line) => ({
      paymentMethod: line.paymentMethod as SelectablePaymentMethod,
      amount: line.amount,
    }));
    return {
      paymentMethod: settlements[0]!.paymentMethod,
      settlements,
    };
  }
  if (hint) {
    return {
      paymentMethod: hint.paymentMethod,
      settlements: hint.settlements,
    };
  }
  return {
    paymentMethod: "cash",
    settlements: [{ paymentMethod: "cash" }],
  };
}

export function reconstructPaidResult(input: {
  check: CashierCheckRecoveryView;
  settlementRecord: CashierSettlementRecordRecoveryView | null;
  presentationHint?: CashierSettlementPresentationHint;
}): CashierRecoveredPaidResult {
  const presentation = input.settlementRecord
    ? presentationFromSettlementRecord(
        input.settlementRecord,
        input.presentationHint
      )
    : input.presentationHint ?? {
        paymentMethod: "cash" as const,
        settlements: [{ paymentMethod: "cash" as const }],
      };
  return {
    checkId: input.check.checkId,
    orderId: input.check.orderId,
    grandTotal: String(input.check.grandTotal),
    settlementRecordId: input.settlementRecord?.settlementRecordId ?? null,
    paymentMethod: presentation.paymentMethod,
    settlements: presentation.settlements,
  };
}

export type CashierSettlementRecoveryReaders = {
  readCheck: () => Promise<CashierCheckRecoveryView | null>;
  readSettlementRecords: (
    checkId: number
  ) => Promise<readonly CashierSettlementRecordRecoveryView[]>;
};

/**
 * Single Check read, then at most one SR list. No settlement write. No loop.
 */
export async function recoverCashierUnknownSettlement(input: {
  restaurantId: number;
  orderId: number;
  presentationHint?: CashierSettlementPresentationHint;
  readers: CashierSettlementRecoveryReaders;
}): Promise<CashierSettlementRecoveryResult> {
  let check: CashierCheckRecoveryView | null;
  try {
    check = await input.readers.readCheck();
  } catch {
    return { kind: "PAYMENT_UNKNOWN", reason: "check_read_failed" };
  }

  const evaluated = evaluateRecoveredCheckOutcome({
    restaurantId: input.restaurantId,
    orderId: input.orderId,
    check,
  });
  if (evaluated.status === "open") {
    return { kind: "PAYMENT_NOT_CONFIRMED", reason: "open" };
  }
  if (evaluated.status === "complimentary") {
    return { kind: "PAYMENT_NOT_CONFIRMED", reason: "complimentary" };
  }
  if (evaluated.status === "voided") {
    return { kind: "PAYMENT_NOT_CONFIRMED", reason: "voided" };
  }
  if (evaluated.status === "missing") {
    return { kind: "PAYMENT_NOT_CONFIRMED", reason: "missing" };
  }
  if (evaluated.status === "invalid") {
    return { kind: "RECOVERY_FAILED", reason: "invalid_check" };
  }

  let records: readonly CashierSettlementRecordRecoveryView[];
  try {
    records = await input.readers.readSettlementRecords(evaluated.check.checkId);
  } catch {
    // Check paid is money truth. Missing SR read is receipt gap, not unpaid.
    return {
      kind: "PAYMENT_CONFIRMED_RECEIPT_INCOMPLETE",
      paid: reconstructPaidResult({
        check: evaluated.check,
        settlementRecord: null,
        presentationHint: input.presentationHint,
      }),
    };
  }

  const settlementRecord = selectCanonicalSettlementRecord(records, {
    checkId: evaluated.check.checkId,
    orderId: input.orderId,
  });
  const paid = reconstructPaidResult({
    check: evaluated.check,
    settlementRecord,
    presentationHint: input.presentationHint,
  });
  if (!settlementRecord) {
    return { kind: "PAYMENT_CONFIRMED_RECEIPT_INCOMPLETE", paid };
  }
  return { kind: "PAYMENT_CONFIRMED", paid };
}

export function toCheckRecoveryView(dto: {
  checkId: number;
  orderId: number;
  restaurantId: number;
  outcome: string;
  grandTotal: string;
}): CashierCheckRecoveryView {
  return {
    checkId: dto.checkId,
    orderId: dto.orderId,
    restaurantId: dto.restaurantId,
    outcome: dto.outcome,
    grandTotal: dto.grandTotal,
  };
}

export function toSettlementRecordRecoveryViews(
  records: readonly {
    settlementRecordId: string;
    checkId: number;
    recordKind: string;
    recordGeneration: number;
    outcome?: string;
    orders?: readonly { orderId: number }[];
    paymentMethods?: readonly { paymentMethod: string; amount: string }[];
  }[]
): CashierSettlementRecordRecoveryView[] {
  return records.map((record) => ({
    settlementRecordId: record.settlementRecordId,
    checkId: record.checkId,
    recordKind: record.recordKind,
    recordGeneration: record.recordGeneration,
    outcome: record.outcome,
    orderIds: (record.orders ?? []).map((order) => order.orderId),
    paymentMethods: (record.paymentMethods ?? []).map((line) => ({
      paymentMethod: line.paymentMethod,
      amount: line.amount,
    })),
  }));
}
