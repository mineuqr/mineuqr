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
  ConcurrentRefundGenerationError,
  executeRefundOnCheck,
  NoPriorSettlementError,
  parseRefundMoney,
  RefundBudgetExceededError,
  requestRefund,
  REFUND_ADR_ID,
  REFUND_PROGRAM_ID,
} from "../index";

const AT = "2026-07-26 14:00:00";

function makeCfAnchor(
  overrides: Partial<{
    collectionFactId: string;
    originalCollectedAmount: string;
    subtotal: string;
    taxAmount: string;
    taxBreakdown: {
      totalTaxAmount: string;
      lines: readonly {
        componentId: string;
        name: string;
        ratePercent: string;
        amount: string;
      }[];
    };
    tenders: readonly { paymentMethod: string; amount: string }[];
  }> = {}
) {
  const amount = overrides.originalCollectedAmount ?? "90.00";
  const taxAmount = overrides.taxAmount ?? "0.00";
  return {
    kind: "collection_fact" as const,
    collectionFactId: overrides.collectionFactId ?? "cf-1",
    paymentIntentId: "pi-1",
    orderId: 55,
    restaurantId: 1,
    checkId: 100,
    originalCollectedAmount: amount,
    currencyCode: "SAR",
    subtotal: overrides.subtotal ?? amount,
    taxAmount,
    taxBreakdown: overrides.taxBreakdown ?? {
      totalTaxAmount: taxAmount,
      lines: [] as const,
    },
    tenders: overrides.tenders ?? [
      { paymentMethod: "cash", amount },
    ],
    committedAt: AT,
    businessDay: "2026-07-26",
    actorId: "7",
    terminalId: "term-1",
    orderingChannel: "qr",
  };
}

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

  it("distinct request at same generation (different amount) conflicts — not already_applied", () => {
    const check = makeCheck();
    const primary = makePrimarySettlement(check);
    const published: SettlementRecord = {
      ...primary,
      settlementRecordId: "sr:1:100:refund:2",
      recordKind: "refund",
      recordGeneration: 2,
      priorSettlementRecordId: primary.settlementRecordId,
      grandTotal: "60.00",
      subtotal: "60.00",
      discountAmount: "0.00",
      taxAmount: "0.00",
      taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
      financialReference: "fin:refund:60",
    };
    expect(() =>
      executeRefundOnCheck({
        check,
        amount: "40.00",
        settlementRecords: [primary],
        orderSettlements: [makeSettledOs(55)],
        at: AT,
        existingRefundRecord: published,
      })
    ).toThrow(ConcurrentRefundGenerationError);
  });

  it("sequential partials after re-read stay within original budget", () => {
    const check = makeCheck({
      grandTotal: "100.00",
      subtotal: "100.00",
      taxAmount: "0.00",
      taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
    });
    const paid = makePrimarySettlement(check);
    const first = executeRefundOnCheck({
      check,
      amount: "60.00",
      settlementRecords: [paid],
      orderSettlements: [makeSettledOs(55, "100.00")],
      at: AT,
    });
    expect(first.outcome).toBe("applied");
    const second = executeRefundOnCheck({
      check,
      amount: "40.00",
      settlementRecords: [paid, first.settlementRecordResult!.record],
      orderSettlements: first.orderSettlements,
      at: AT,
    });
    expect(second.outcome).toBe("applied");
    const total =
      parseRefundMoney(first.settlementRecordResult!.record.grandTotal) +
      parseRefundMoney(second.settlementRecordResult!.record.grandTotal);
    expect(total).toBe(100);
    expect(second.remainingBudget).toBe("0.00");
  });

  it("60+60 on 100: second after first history is over-budget", () => {
    const check = makeCheck({
      grandTotal: "100.00",
      subtotal: "100.00",
      taxAmount: "0.00",
      taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
    });
    const paid = makePrimarySettlement(check);
    const first = executeRefundOnCheck({
      check,
      amount: "60.00",
      settlementRecords: [paid],
      orderSettlements: [makeSettledOs(55, "100.00")],
      at: AT,
    });
    expect(() =>
      executeRefundOnCheck({
        check,
        amount: "60.00",
        settlementRecords: [paid, first.settlementRecordResult!.record],
        orderSettlements: first.orderSettlements,
        at: AT,
      })
    ).toThrow(RefundBudgetExceededError);
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

  it("concurrent generation: existing different amount at next gen conflicts", () => {
    const check = makeCheck();
    const primary = makePrimarySettlement(check);
    const alien: SettlementRecord = {
      ...primary,
      settlementRecordId: "sr:1:100:refund:2",
      recordKind: "refund",
      recordGeneration: 2,
      priorSettlementRecordId: primary.settlementRecordId,
      grandTotal: "999.00",
      subtotal: "999.00",
      discountAmount: "0.00",
      taxAmount: "0.00",
      taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
      financialReference: "fin:other",
    };
    expect(() =>
      executeRefundOnCheck({
        check,
        amount: "10.00",
        settlementRecords: [primary],
        orderSettlements: [makeSettledOs(55)],
        at: AT,
        existingRefundRecord: alien,
      })
    ).toThrow(ConcurrentRefundGenerationError);
  });

  it("concurrent generation: same amount at next gen is already_applied", () => {
    const check = makeCheck();
    const primary = makePrimarySettlement(check);
    const published: SettlementRecord = {
      ...primary,
      settlementRecordId: "sr:1:100:refund:2",
      recordKind: "refund",
      recordGeneration: 2,
      priorSettlementRecordId: primary.settlementRecordId,
      grandTotal: "10.00",
      subtotal: "10.00",
      discountAmount: "0.00",
      taxAmount: "0.00",
      taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
      financialReference: "fin:refund:10",
    };
    const result = executeRefundOnCheck({
      check,
      amount: "10.00",
      settlementRecords: [primary],
      orderSettlements: [makeSettledOs(55)],
      at: AT,
      existingRefundRecord: published,
    });
    expect(result.outcome).toBe("already_applied");
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
    const originalSale = makeCfAnchor({
      tenders: [{ paymentMethod: "card", amount: "90.00" }],
    });
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
    const originalSale = makeCfAnchor({
      collectionFactId: "cf-comp",
      originalCollectedAmount: "0.00",
      tenders: [{ paymentMethod: "other", amount: "0.00" }],
    });
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

  it("CF-backed refund identifies the original sale without gen=1 SR and persists a refund SR", () => {
    const check = makeCheck();
    const originalSale = makeCfAnchor();
    const budget = calculateRefundBudget({
      restaurantId: 1,
      checkId: 100,
      settlementRecords: [],
      originalSale,
    });
    expect(budget.settledValue).toBe("90.00");
    expect(budget.priorSettlementRecordId).toBe("");
    expect(budget.collectionFactId).toBe("cf-1");

    expect(() =>
      executeRefundOnCheck({
        check,
        amount: "90.01",
        settlementRecords: [],
        orderSettlements: [makeSettledOs(55, "90.00")],
        at: AT,
        originalSaleAnchor: originalSale,
      })
    ).toThrow(RefundBudgetExceededError);

    const first = executeRefundOnCheck({
      check,
      amount: "10.00",
      settlementRecords: [],
      orderSettlements: [makeSettledOs(55, "90.00")],
      at: AT,
      originalSaleAnchor: originalSale,
      tenderMethod: "card",
    });
    expect(first.outcome).toBe("applied");
    expect(first.remainingBudget).toBe("80.00");
    expect(first.refund.referenceLink.originalCollectionFactId).toBe("cf-1");
    expect(first.refund.referenceLink.priorSettlementRecordId).toBe("");
    const refundDoc = first.settlementRecordResult?.record;
    expect(refundDoc?.recordKind).toBe("refund");
    expect(refundDoc?.priorSettlementRecordId).toBeNull();
    expect(refundDoc?.grandTotal).toBe("10.00");
    // Original CF tenders win over client tenderMethod (multi-tender fidelity).
    expect(refundDoc?.paymentSnapshot[0]?.paymentMethod).toBe("cash");
    expect(refundDoc?.recordGeneration).toBe(1);

    const second = executeRefundOnCheck({
      check,
      amount: "40.00",
      settlementRecords: [refundDoc!],
      orderSettlements: first.orderSettlements,
      at: "2026-07-26 14:05:00",
      originalSaleAnchor: originalSale,
    });
    expect(second.remainingBudget).toBe("40.00");
    expect(second.refund.referenceLink.priorSettlementRecordId).toBe(
      refundDoc!.settlementRecordId
    );
    expect(second.settlementRecordResult?.record.priorSettlementRecordId).toBe(
      refundDoc!.settlementRecordId
    );

    const last = executeRefundOnCheck({
      check,
      amount: "40.00",
      settlementRecords: [refundDoc!, second.settlementRecordResult!.record],
      orderSettlements: second.orderSettlements,
      at: "2026-07-26 14:10:00",
      originalSaleAnchor: originalSale,
    });
    expect(last.remainingBudget).toBe("0.00");
    expect(last.orderSettlements[0]?.status).toBe("refunded");

    expect(() =>
      executeRefundOnCheck({
        check,
        amount: "0.01",
        settlementRecords: [
          refundDoc!,
          second.settlementRecordResult!.record,
          last.settlementRecordResult!.record,
        ],
        orderSettlements: last.orderSettlements,
        at: "2026-07-26 14:15:00",
        originalSaleAnchor: originalSale,
      })
    ).toThrow(AlreadyRefundedError);
  });

  it("multi-tender CF full refund mirrors original tender split", () => {
    const check = makeCheck({
      grandTotal: "100.00",
      subtotal: "100.00",
      taxAmount: "0.00",
    });
    const originalSale = makeCfAnchor({
      originalCollectedAmount: "100.00",
      subtotal: "100.00",
      taxAmount: "0.00",
      tenders: [
        { paymentMethod: "cash", amount: "40.00" },
        { paymentMethod: "card", amount: "60.00" },
      ],
    });
    const result = executeRefundOnCheck({
      check,
      amount: "100.00",
      settlementRecords: [],
      orderSettlements: [makeSettledOs(55, "100.00")],
      at: AT,
      originalSaleAnchor: originalSale,
      tenderMethod: "other",
    });
    const snap = result.settlementRecordResult?.record.paymentSnapshot ?? [];
    expect(snap).toHaveLength(2);
    expect(snap.find((p) => p.paymentMethod === "cash")?.amount).toBe("40.00");
    expect(snap.find((p) => p.paymentMethod === "card")?.amount).toBe("60.00");
  });

  it("CF-backed refund reverse snapshot mirrors original tax on full refund", () => {
    const check = makeCheck({ grandTotal: "115.00" });
    const originalSale = makeCfAnchor({
      originalCollectedAmount: "115.00",
      subtotal: "100.00",
      taxAmount: "15.00",
      tenders: [{ paymentMethod: "cash", amount: "115.00" }],
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
    });
    const result = executeRefundOnCheck({
      check,
      amount: "115.00",
      settlementRecords: [],
      orderSettlements: [makeSettledOs(55, "115.00")],
      at: AT,
      originalSaleAnchor: originalSale,
    });
    const doc = result.settlementRecordResult?.record;
    expect(doc?.taxAmount).toBe("15.00");
    expect(doc?.subtotal).toBe("100.00");
    expect(doc?.taxBreakdown.lines[0]?.amount).toBe("15.00");
  });

  it("CF-backed refund retry at the same generation is already_applied", () => {
    const check = makeCheck();
    const originalSale = makeCfAnchor();
    const first = executeRefundOnCheck({
      check,
      amount: "10.00",
      settlementRecords: [],
      orderSettlements: [makeSettledOs(55, "90.00")],
      at: AT,
      originalSaleAnchor: originalSale,
    });
    const retry = executeRefundOnCheck({
      check,
      amount: "10.00",
      settlementRecords: [],
      orderSettlements: [makeSettledOs(55, "90.00")],
      at: AT,
      originalSaleAnchor: originalSale,
      existingRefundRecord: first.settlementRecordResult!.record,
    });
    expect(retry.outcome).toBe("already_applied");
    expect(retry.settlementRecordResult?.record.settlementRecordId).toBe(
      first.settlementRecordResult?.record.settlementRecordId
    );
  });

  it("legacy refund without production CF still requires gen=1 SR", () => {
    const check = makeCheck();
    expect(() =>
      executeRefundOnCheck({
        check,
        amount: "10.00",
        settlementRecords: [],
        orderSettlements: [makeSettledOs(55)],
        at: AT,
        originalSaleAnchor: {
          kind: "legacy_settlement_record",
          restaurantId: 1,
          checkId: 100,
          reason: "no_production_collection_fact",
        },
      })
    ).toThrow(NoPriorSettlementError);
  });
});
