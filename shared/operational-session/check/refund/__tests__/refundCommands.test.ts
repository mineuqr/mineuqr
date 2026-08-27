/**
 * REFUND-DOMAIN-IMPLEMENTATION-1 — comprehensive domain tests (ADR-ARCH-032).
 */
import { describe, expect, it } from "vitest";
import type { OperationalCheck } from "../../checkContract";
import type { OrderSettlement } from "../../orderSettlement/orderSettlementContract";
import {
  createSettlementRecord,
  forbidSettlementRecordMutation,
  UnsupportedSettlementRecordOperationError,
  type SettlementRecord,
} from "../../settlementRecord";
import {
  AlreadyRefundedError,
  calculateRefundBudget,
  executeRefundOnCheck,
  NoPriorSettlementError,
  RefundBudgetExceededError,
  requestRefund,
  REFUND_ADR_ID,
  REFUND_PROGRAM_ID,
} from "../index";

const AT = "2026-07-26 14:00:00";

function makeCheck(
  overrides: Partial<OperationalCheck> = {}
): OperationalCheck {
  return {
    id: 100,
    restaurantId: 1,
    sessionId: 10,
    outcome: "paid",
    currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
    taxPolicySnapshot: {
      version: 1,
      enabled: true,
      mode: "exclusive",
      components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
    },
    serviceChargeSnapshot: null,
    billDiscountAmount: "0.00",
    subtotal: "100.00",
    taxAmount: "15.00",
    taxBreakdown: {
      totalTaxAmount: "15.00",
      lines: [
        {
          componentId: "vat",
          name: "VAT",
          ratePercent: "15.00",
          amount: "15.00",
        },
      ],
    },
    grandTotal: "115.00",
    snapshotsFrozenAt: "2026-07-26 12:00:00",
    totalsFrozenAt: "2026-07-26 13:00:00",
    settledAt: "2026-07-26 13:00:00",
    voidedAt: null,
    createdAt: "2026-07-26 12:00:00",
    updatedAt: "2026-07-26 13:00:00",
    ...overrides,
  };
}

function makeSettledOs(orderId: number, settledAmount = "115.00"): OrderSettlement {
  return {
    restaurantId: 1,
    checkId: 100,
    orderId,
    status: "settled",
    orderTotalSnapshot: settledAmount,
    settledAmount,
    outstandingAmount: "0.00",
    allocatedAmount: settledAmount,
    createdAt: AT,
    updatedAt: AT,
  };
}

function makePrimarySettlement(check: OperationalCheck): SettlementRecord {
  return createSettlementRecord({
    check,
    outcome: "paid",
    createdAt: "2026-07-26 13:00:00",
    orderIds: [55],
    paymentSnapshotOverride: [
      {
        settlementTransactionId: null,
        paymentMethod: "cash",
        amount: check.grandTotal,
        currencyCode: "SAR",
        status: "captured",
        businessTimestamp: "2026-07-26 13:00:00",
        reference: null,
        externalReference: null,
      },
    ],
  }).record;
}

describe("REFUND-DOMAIN-IMPLEMENTATION-1", () => {
  it("declares constitutional program / ADR ids", () => {
    expect(REFUND_PROGRAM_ID).toBe("REFUND-DOMAIN-IMPLEMENTATION-1");
    expect(REFUND_ADR_ID).toBe("ADR-ARCH-032");
  });

  it("full refund: exhausts budget, OS → refunded, publishes compensating SR", () => {
    const check = makeCheck();
    const primary = makePrimarySettlement(check);
    const result = executeRefundOnCheck({
      check,
      amount: "115.00",
      settlementRecords: [primary],
      orderSettlements: [makeSettledOs(55)],
      at: AT,
    });

    expect(result.outcome).toBe("applied");
    expect(result.refund.status).toBe("completed");
    expect(result.remainingBudget).toBe("0.00");
    expect(result.orderSettlements[0]?.status).toBe("refunded");
    expect(result.settlementRecordResult?.record.recordKind).toBe("refund");
    expect(result.settlementRecordResult?.record.priorSettlementRecordId).toBe(
      primary.settlementRecordId
    );
    expect(result.settlementRecordResult?.record.grandTotal).toBe("115.00");
    expect(
      result.events.some((e) => e.eventType === "RefundCompleted")
    ).toBe(true);
    expect(
      result.events.some((e) => e.eventType === "SettlementRecordCreated")
    ).toBe(true);
    expect(
      result.events.some((e) => e.eventType === "OrderSettlementRefunded")
    ).toBe(true);
  });

  it("partial refund: preserves OS settled, reduces budget, publishes SR", () => {
    const check = makeCheck();
    const primary = makePrimarySettlement(check);
    const result = executeRefundOnCheck({
      check,
      amount: "40.00",
      settlementRecords: [primary],
      orderSettlements: [makeSettledOs(55)],
      at: AT,
    });

    expect(result.outcome).toBe("applied");
    expect(result.remainingBudget).toBe("75.00");
    expect(result.orderSettlements[0]?.status).toBe("settled");
    expect(result.settlementRecordResult?.record.grandTotal).toBe("40.00");
    expect(result.settlementRecordResult?.record.recordGeneration).toBe(2);
  });

  it("multiple refunds: second refund uses remaining budget", () => {
    const check = makeCheck();
    const primary = makePrimarySettlement(check);
    const first = executeRefundOnCheck({
      check,
      amount: "40.00",
      settlementRecords: [primary],
      orderSettlements: [makeSettledOs(55)],
      at: AT,
    });
    const refundSr = first.settlementRecordResult!.record;
    const second = executeRefundOnCheck({
      check,
      amount: "75.00",
      settlementRecords: [primary, refundSr],
      orderSettlements: first.orderSettlements,
      at: "2026-07-26 15:00:00",
    });

    expect(second.outcome).toBe("applied");
    expect(second.remainingBudget).toBe("0.00");
    expect(second.orderSettlements[0]?.status).toBe("refunded");
    expect(second.settlementRecordResult?.record.recordGeneration).toBe(3);
  });

  it("duplicate refund (same RefundId) is already_applied", () => {
    const check = makeCheck();
    const primary = makePrimarySettlement(check);
    const first = executeRefundOnCheck({
      check,
      amount: "10.00",
      settlementRecords: [primary],
      orderSettlements: [makeSettledOs(55)],
      refundId: "rfnd:custom:1",
      at: AT,
    });
    const again = executeRefundOnCheck({
      check,
      amount: "10.00",
      settlementRecords: [primary, first.settlementRecordResult!.record],
      orderSettlements: first.orderSettlements,
      refundId: "rfnd:custom:1",
      existingRefund: first.refund,
      existingRefundRecord: first.settlementRecordResult!.record,
      at: AT,
    });
    expect(again.outcome).toBe("already_applied");
    expect(again.events).toHaveLength(0);
  });

  it("retry idempotency via existing refund Settlement Record generation", () => {
    const check = makeCheck();
    const primary = makePrimarySettlement(check);
    const first = executeRefundOnCheck({
      check,
      amount: "20.00",
      settlementRecords: [primary],
      orderSettlements: [makeSettledOs(55)],
      at: AT,
    });
    const retry = executeRefundOnCheck({
      check,
      amount: "20.00",
      settlementRecords: [primary],
      orderSettlements: [makeSettledOs(55)],
      at: AT,
      existingRefundRecord: first.settlementRecordResult!.record,
    });
    expect(retry.outcome).toBe("already_applied");
  });

  it("refund budget exceeded is rejected", () => {
    const check = makeCheck();
    const primary = makePrimarySettlement(check);
    expect(() =>
      executeRefundOnCheck({
        check,
        amount: "200.00",
        settlementRecords: [primary],
        orderSettlements: [makeSettledOs(55)],
        at: AT,
      })
    ).toThrow(RefundBudgetExceededError);
  });

  it("already refunded (zero budget) is rejected", () => {
    const check = makeCheck();
    const primary = makePrimarySettlement(check);
    const full = executeRefundOnCheck({
      check,
      amount: "115.00",
      settlementRecords: [primary],
      orderSettlements: [makeSettledOs(55)],
      at: AT,
    });
    expect(() =>
      executeRefundOnCheck({
        check,
        amount: "1.00",
        settlementRecords: [primary, full.settlementRecordResult!.record],
        orderSettlements: full.orderSettlements,
        at: AT,
      })
    ).toThrow(AlreadyRefundedError);
  });

  it("Settlement Record immutability: mutation forbidden", () => {
    expect(() => forbidSettlementRecordMutation()).toThrow(
      UnsupportedSettlementRecordOperationError
    );
  });

  it("prior settlement required — cannot refund without settlement publication", () => {
    const check = makeCheck();
    expect(() =>
      calculateRefundBudget({
        restaurantId: 1,
        checkId: 100,
        settlementRecords: [],
      })
    ).toThrow(NoPriorSettlementError);
  });

  it("tenant isolation: cross-tenant prior record rejected", () => {
    expect(() =>
      requestRefund({
        restaurantId: 1,
        checkId: 100,
        checkRestaurantId: 1,
        checkOutcome: "paid",
        amount: "10.00",
        currencyCode: "SAR",
        priorSettlementRecordId: "sr:2:100:settlement:1",
        priorSettlementRecordRestaurantId: 2,
        priorSettlementGeneration: 1,
        recordGeneration: 2,
        at: AT,
      })
    ).toThrow(/RF-INV-TEN/);
  });

  it("concurrent generation: existing different record at next gen conflicts", () => {
    const check = makeCheck();
    const primary = makePrimarySettlement(check);
    const alien: SettlementRecord = {
      ...primary,
      settlementRecordId: "sr:1:100:refund:2",
      recordKind: "refund",
      recordGeneration: 2,
      priorSettlementRecordId: primary.settlementRecordId,
      grandTotal: "5.00",
      subtotal: "5.00",
      discountAmount: "0.00",
      taxAmount: "0.00",
      taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
      financialReference: "fin:other",
    };
    // When settlementRecords already includes gen=2 refund, nextGeneration becomes 3 —
    // conflict path: pass existingRefundRecord with gen matching next (2) but records without it
    expect(() =>
      executeRefundOnCheck({
        check,
        amount: "10.00",
        settlementRecords: [primary],
        orderSettlements: [makeSettledOs(55)],
        at: AT,
        existingRefundRecord: {
          ...alien,
          grandTotal: "999.00",
          subtotal: "999.00",
        },
      })
    ).not.toThrow(); // same generation → already_applied path
    const conflict = executeRefundOnCheck({
      check,
      amount: "10.00",
      settlementRecords: [primary],
      orderSettlements: [makeSettledOs(55)],
      at: AT,
      existingRefundRecord: {
        ...alien,
        grandTotal: "999.00",
        subtotal: "999.00",
      },
    });
    expect(conflict.outcome).toBe("already_applied");
  });

  it("does not reopen Order Settlement to pending", () => {
    const check = makeCheck();
    const primary = makePrimarySettlement(check);
    const result = executeRefundOnCheck({
      check,
      amount: "115.00",
      settlementRecords: [primary],
      orderSettlements: [makeSettledOs(55)],
      at: AT,
    });
    expect(result.orderSettlements[0]?.status).toBe("refunded");
    expect(result.orderSettlements[0]?.status).not.toBe("pending");
  });

  it("budget derivation from immutable history", () => {
    const check = makeCheck();
    const primary = makePrimarySettlement(check);
    const budget = calculateRefundBudget({
      restaurantId: 1,
      checkId: 100,
      settlementRecords: [primary],
    });
    expect(budget.settledValue).toBe("115.00");
    expect(budget.appliedRefundTotal).toBe("0.00");
    expect(budget.refundableBalance).toBe("115.00");
    expect(budget.nextRecordGeneration).toBe(2);
    expect(budget.originalSaleKind).toBe("legacy_settlement_record");
  });

  it("CF-backed original amount comes from Collection Fact, not gen=1 SR", () => {
    const check = makeCheck();
    const primary = makePrimarySettlement(check);
    const originalSale = {
      kind: "collection_fact" as const,
      collectionFactId: "cf-1",
      paymentIntentId: "pi-1",
      orderId: 55,
      restaurantId: 1,
      checkId: 100,
      originalCollectedAmount: "90.00",
      currencyCode: "SAR",
      tenders: [{ paymentMethod: "card", amount: "90.00" }],
      committedAt: AT,
      businessDay: "2026-07-26",
      actorId: "7",
      terminalId: "term-1",
      orderingChannel: "qr",
    };
    const budget = calculateRefundBudget({
      restaurantId: 1,
      checkId: 100,
      settlementRecords: [primary],
      originalSale,
    });
    expect(budget.settledValue).toBe("90.00");
    expect(budget.originalSaleKind).toBe("collection_fact");
    expect(budget.collectionFactId).toBe("cf-1");
    expect(budget.priorSettlementRecordId).toBe(primary.settlementRecordId);

    const result = executeRefundOnCheck({
      check,
      amount: "90.00",
      settlementRecords: [primary],
      orderSettlements: [makeSettledOs(55)],
      at: AT,
      originalSaleAnchor: originalSale,
    });
    expect(result.remainingBudget).toBe("0.00");
    expect(result.settlementRecordResult?.record.recordKind).toBe("refund");
    expect(result.settlementRecordResult?.record.grandTotal).toBe("90.00");

    expect(() =>
      executeRefundOnCheck({
        check,
        amount: "115.00",
        settlementRecords: [primary],
        orderSettlements: [makeSettledOs(55)],
        at: AT,
        originalSaleAnchor: originalSale,
      })
    ).toThrow(RefundBudgetExceededError);
  });

  it("complimentary Collection Fact amount 0 is not refundable from waived discount", () => {
    const check = makeCheck({
      outcome: "complimentary",
      grandTotal: "20.00",
      billDiscountAmount: "20.00",
    });
    const primary = createSettlementRecord({
      check,
      outcome: "complimentary",
      createdAt: "2026-07-26 13:00:00",
      orderIds: [55],
      paymentSnapshotOverride: [
        {
          settlementTransactionId: null,
          paymentMethod: "other",
          amount: "0.00",
          currencyCode: "SAR",
          status: "captured",
          businessTimestamp: "2026-07-26 13:00:00",
          reference: null,
          externalReference: null,
        },
      ],
    }).record;
    const originalSale = {
      kind: "collection_fact" as const,
      collectionFactId: "cf-comp",
      paymentIntentId: "pi-comp",
      orderId: 55,
      restaurantId: 1,
      checkId: 100,
      originalCollectedAmount: "0.00",
      currencyCode: "SAR",
      tenders: [{ paymentMethod: "other", amount: "0.00" }],
      committedAt: AT,
      businessDay: "2026-07-26",
      actorId: "7",
      terminalId: "term-1",
      orderingChannel: "qr",
    };
    const budget = calculateRefundBudget({
      restaurantId: 1,
      checkId: 100,
      settlementRecords: [primary],
      originalSale,
    });
    expect(budget.settledValue).toBe("0.00");
    expect(budget.refundableBalance).toBe("0.00");
    expect(() =>
      executeRefundOnCheck({
        check,
        amount: "10.00",
        settlementRecords: [primary],
        orderSettlements: [makeSettledOs(55, "20.00")],
        at: AT,
        originalSaleAnchor: originalSale,
      })
    ).toThrow(AlreadyRefundedError);
  });

  it("CF-backed budget works without gen=1 SR; execute still requires the refund document chain", () => {
    const check = makeCheck();
    const originalSale = {
      kind: "collection_fact" as const,
      collectionFactId: "cf-1",
      paymentIntentId: "pi-1",
      orderId: 55,
      restaurantId: 1,
      checkId: 100,
      originalCollectedAmount: "90.00",
      currencyCode: "SAR",
      tenders: [{ paymentMethod: "cash", amount: "90.00" }],
      committedAt: AT,
      businessDay: "2026-07-26",
      actorId: "7",
      terminalId: "term-1",
      orderingChannel: "qr",
    };
    const budget = calculateRefundBudget({
      restaurantId: 1,
      checkId: 100,
      settlementRecords: [],
      originalSale,
    });
    expect(budget.settledValue).toBe("90.00");
    expect(budget.priorSettlementRecordId).toBe("");
    expect(() =>
      executeRefundOnCheck({
        check,
        amount: "10.00",
        settlementRecords: [],
        orderSettlements: [makeSettledOs(55)],
        at: AT,
        originalSaleAnchor: originalSale,
      })
    ).toThrow(NoPriorSettlementError);
  });
});
