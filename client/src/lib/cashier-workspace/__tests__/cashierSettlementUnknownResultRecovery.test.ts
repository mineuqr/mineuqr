/**
 * CASHIER-SETTLEMENT-UNKNOWN-RESULT-RECOVERY-1
 */
import { describe, expect, it } from "vitest";
import { TRPCClientError } from "@trpc/client";
import { classifyCashierSettlementFailure } from "../cashierSettlementUnknownResult";
import {
  evaluateRecoveredCheckOutcome,
  recoverCashierUnknownSettlement,
  reconstructPaidResult,
  selectCanonicalSettlementRecord,
  type CashierCheckRecoveryView,
  type CashierSettlementRecordRecoveryView,
} from "../cashierSettlementRecovery";

function trpcError(code: string, message: string, posCode?: string) {
  return new TRPCClientError(message, {
    result: {
      error: {
        message,
        data: { code, httpStatus: 400, path: "pos.settlement.initiate", posCode },
        code: -32000,
      },
    },
  });
}

const paidCheck: CashierCheckRecoveryView = {
  checkId: 9,
  orderId: 55,
  restaurantId: 1,
  outcome: "paid",
  grandTotal: "11.50",
};

const settlementRecord: CashierSettlementRecordRecoveryView = {
  settlementRecordId: "sr:1:9:settlement:1",
  checkId: 9,
  recordKind: "settlement",
  recordGeneration: 1,
  orderIds: [55],
  paymentMethods: [{ paymentMethod: "cash", amount: "11.50" }],
};

describe("classifyCashierSettlementFailure", () => {
  it("treats check_already_terminal as UNKNOWN_RESULT", () => {
    expect(
      classifyCashierSettlementFailure(
        trpcError("BAD_REQUEST", "Check is already terminal", "check_already_terminal")
      )
    ).toBe("UNKNOWN_RESULT");
    expect(
      classifyCashierSettlementFailure(
        trpcError("BAD_REQUEST", "Check is already terminal")
      )
    ).toBe("UNKNOWN_RESULT");
  });

  it("treats timeout, network, conflict, and abort as UNKNOWN_RESULT", () => {
    expect(
      classifyCashierSettlementFailure(trpcError("TIMEOUT", "timeout"))
    ).toBe("UNKNOWN_RESULT");
    expect(
      classifyCashierSettlementFailure(
        new TypeError("Failed to fetch")
      )
    ).toBe("UNKNOWN_RESULT");
    expect(
      classifyCashierSettlementFailure(
        trpcError("CONFLICT", "conflict", "concurrency_conflict")
      )
    ).toBe("UNKNOWN_RESULT");
    const abort = new Error("aborted");
    abort.name = "AbortError";
    expect(classifyCashierSettlementFailure(abort)).toBe("UNKNOWN_RESULT");
    expect(
      classifyCashierSettlementFailure(
        trpcError("INTERNAL_SERVER_ERROR", "unexpected")
      )
    ).toBe("UNKNOWN_RESULT");
  });

  it("does not recover pre-commit and register-gap failures", () => {
    expect(
      classifyCashierSettlementFailure(
        trpcError("FORBIDDEN", "غير مصرح بالوصول", "pos_permission_denied")
      )
    ).toBe("DEFINITELY_NOT_PAID");
    expect(
      classifyCashierSettlementFailure(
        trpcError("BAD_REQUEST", "Order not found", "order_not_found")
      )
    ).toBe("DEFINITELY_NOT_PAID");
    expect(
      classifyCashierSettlementFailure(
        trpcError("BAD_REQUEST", "An open Financial Shift is required")
      )
    ).toBe("DEFINITELY_NOT_PAID");
    expect(
      classifyCashierSettlementFailure(
        trpcError("BAD_REQUEST", "Check not found", "check_not_found")
      )
    ).toBe("DEFINITELY_NOT_PAID");
  });
});

describe("evaluateRecoveredCheckOutcome", () => {
  it("accepts only paid as financial completion", () => {
    expect(
      evaluateRecoveredCheckOutcome({
        restaurantId: 1,
        orderId: 55,
        check: paidCheck,
      }).status
    ).toBe("paid");
    expect(
      evaluateRecoveredCheckOutcome({
        restaurantId: 1,
        orderId: 55,
        check: { ...paidCheck, outcome: "open" },
      }).status
    ).toBe("open");
    expect(
      evaluateRecoveredCheckOutcome({
        restaurantId: 1,
        orderId: 55,
        check: { ...paidCheck, outcome: "complimentary" },
      }).status
    ).toBe("complimentary");
    expect(
      evaluateRecoveredCheckOutcome({
        restaurantId: 1,
        orderId: 55,
        check: { ...paidCheck, outcome: "voided" },
      }).status
    ).toBe("voided");
  });

  it("rejects cross-restaurant and order mismatch without exposing Paid", () => {
    expect(
      evaluateRecoveredCheckOutcome({
        restaurantId: 2,
        orderId: 55,
        check: paidCheck,
      }).status
    ).toBe("invalid");
    expect(
      evaluateRecoveredCheckOutcome({
        restaurantId: 1,
        orderId: 99,
        check: paidCheck,
      }).status
    ).toBe("invalid");
    expect(
      evaluateRecoveredCheckOutcome({
        restaurantId: 1,
        orderId: 55,
        check: null,
      }).status
    ).toBe("missing");
  });
});

describe("selectCanonicalSettlementRecord", () => {
  it("selects settlement kind by Check identity, ignoring refunds", () => {
    const refund: CashierSettlementRecordRecoveryView = {
      settlementRecordId: "sr:1:9:refund:2",
      checkId: 9,
      recordKind: "refund",
      recordGeneration: 2,
      orderIds: [55],
      paymentMethods: [],
    };
    expect(
      selectCanonicalSettlementRecord([refund, settlementRecord], {
        checkId: 9,
        orderId: 55,
      })?.settlementRecordId
    ).toBe("sr:1:9:settlement:1");
  });

  it("does not match a different Check", () => {
    expect(
      selectCanonicalSettlementRecord([settlementRecord], {
        checkId: 8,
        orderId: 55,
      })
    ).toBeNull();
  });
});

describe("reconstructPaidResult", () => {
  it("copies Check.grandTotal and SR id without client arithmetic", () => {
    const paid = reconstructPaidResult({
      check: paidCheck,
      settlementRecord,
    });
    expect(paid.grandTotal).toBe("11.50");
    expect(paid.settlementRecordId).toBe("sr:1:9:settlement:1");
    expect(paid.settlements[0]?.amount).toBe("11.50");
  });

  it("does not invent an SR id when the record is missing", () => {
    const paid = reconstructPaidResult({
      check: paidCheck,
      settlementRecord: null,
      presentationHint: {
        paymentMethod: "card",
        settlements: [{ paymentMethod: "card" }],
      },
    });
    expect(paid.settlementRecordId).toBeNull();
    expect(paid.grandTotal).toBe("11.50");
    expect(paid.paymentMethod).toBe("card");
  });
});

describe("recoverCashierUnknownSettlement", () => {
  it("TEST 2/7: paid Check + SR reconstructs Paid without a settlement write", async () => {
    let settleWrites = 0;
    const result = await recoverCashierUnknownSettlement({
      restaurantId: 1,
      orderId: 55,
      readers: {
        readCheck: async () => paidCheck,
        readSettlementRecords: async () => {
          settleWrites += 0;
          return [settlementRecord];
        },
      },
    });
    expect(result.kind).toBe("PAYMENT_CONFIRMED");
    if (result.kind === "PAYMENT_CONFIRMED") {
      expect(result.paid.checkId).toBe(9);
      expect(result.paid.grandTotal).toBe("11.50");
      expect(result.paid.settlementRecordId).toBe("sr:1:9:settlement:1");
    }
    expect(settleWrites).toBe(0);
  });

  it("TEST 6: open Check without Collection Fact stays unpaid", async () => {
    const result = await recoverCashierUnknownSettlement({
      restaurantId: 1,
      orderId: 55,
      readers: {
        readCheck: async () => ({ ...paidCheck, outcome: "open" }),
        readSettlementRecords: async () => {
          throw new Error("must not read SR for open Check");
        },
      },
    });
    expect(result).toEqual({
      kind: "PAYMENT_NOT_CONFIRMED",
      reason: "open",
    });
  });

  it("treats OPEN Check + financiallyPaid Collection Fact as PAYMENT_CONFIRMED", async () => {
    const result = await recoverCashierUnknownSettlement({
      restaurantId: 1,
      orderId: 55,
      readers: {
        readCheck: async () => ({
          ...paidCheck,
          outcome: "open",
          financiallyPaid: true,
          collectionFactId: "pcf_1",
        }),
        readSettlementRecords: async () => [settlementRecord],
      },
    });
    expect(result.kind).toBe("PAYMENT_CONFIRMED");
    if (result.kind === "PAYMENT_CONFIRMED") {
      expect(result.paid.checkId).toBe(9);
      expect(result.paid.grandTotal).toBe("11.50");
    }
  });

  it("TEST 9/10: complimentary and voided never become Paid", async () => {
    const complimentary = await recoverCashierUnknownSettlement({
      restaurantId: 1,
      orderId: 55,
      readers: {
        readCheck: async () => ({ ...paidCheck, outcome: "complimentary" }),
        readSettlementRecords: async () => {
          throw new Error("must not read SR");
        },
      },
    });
    const voided = await recoverCashierUnknownSettlement({
      restaurantId: 1,
      orderId: 55,
      readers: {
        readCheck: async () => ({ ...paidCheck, outcome: "voided" }),
        readSettlementRecords: async () => {
          throw new Error("must not read SR");
        },
      },
    });
    expect(complimentary).toEqual({
      kind: "PAYMENT_NOT_CONFIRMED",
      reason: "complimentary",
    });
    expect(voided).toEqual({
      kind: "PAYMENT_NOT_CONFIRMED",
      reason: "voided",
    });
  });

  it("TEST 8: paid Check with SR read failure is receipt-incomplete, not unpaid", async () => {
    const result = await recoverCashierUnknownSettlement({
      restaurantId: 1,
      orderId: 55,
      readers: {
        readCheck: async () => paidCheck,
        readSettlementRecords: async () => {
          throw new Error("sr unavailable");
        },
      },
    });
    expect(result.kind).toBe("PAYMENT_CONFIRMED_RECEIPT_INCOMPLETE");
    if (result.kind === "PAYMENT_CONFIRMED_RECEIPT_INCOMPLETE") {
      expect(result.paid.grandTotal).toBe("11.50");
      expect(result.paid.settlementRecordId).toBeNull();
    }
  });

  it("TEST 14: paid Check rediscovers SR when HTTP result lacked the id", async () => {
    const result = await recoverCashierUnknownSettlement({
      restaurantId: 1,
      orderId: 55,
      readers: {
        readCheck: async () => paidCheck,
        readSettlementRecords: async () => [settlementRecord],
      },
    });
    expect(result.kind).toBe("PAYMENT_CONFIRMED");
    if (result.kind === "PAYMENT_CONFIRMED") {
      expect(result.paid.settlementRecordId).not.toBeNull();
    }
  });

  it("TEST 11: a second terminal recovers the same paid Check/SR without writing", async () => {
    const terminalA = await recoverCashierUnknownSettlement({
      restaurantId: 1,
      orderId: 55,
      readers: {
        readCheck: async () => paidCheck,
        readSettlementRecords: async () => [settlementRecord],
      },
    });
    const terminalB = await recoverCashierUnknownSettlement({
      restaurantId: 1,
      orderId: 55,
      readers: {
        readCheck: async () => paidCheck,
        readSettlementRecords: async () => [settlementRecord],
      },
    });
    expect(terminalA.kind).toBe("PAYMENT_CONFIRMED");
    expect(terminalB.kind).toBe("PAYMENT_CONFIRMED");
    if (
      terminalA.kind === "PAYMENT_CONFIRMED" &&
      terminalB.kind === "PAYMENT_CONFIRMED"
    ) {
      expect(terminalB.paid.settlementRecordId).toBe(
        terminalA.paid.settlementRecordId
      );
      expect(terminalB.paid.grandTotal).toBe(terminalA.paid.grandTotal);
    }
  });

  it("TEST 15: cross-restaurant Check is invalid, not Paid", async () => {
    const result = await recoverCashierUnknownSettlement({
      restaurantId: 2,
      orderId: 55,
      readers: {
        readCheck: async () => paidCheck,
        readSettlementRecords: async () => [settlementRecord],
      },
    });
    expect(result).toEqual({
      kind: "RECOVERY_FAILED",
      reason: "invalid_check",
    });
  });

  it("does not read Settlement Record until Check is paid", async () => {
    let srReads = 0;
    await recoverCashierUnknownSettlement({
      restaurantId: 1,
      orderId: 55,
      readers: {
        readCheck: async () => ({ ...paidCheck, outcome: "open" }),
        readSettlementRecords: async () => {
          srReads += 1;
          return [];
        },
      },
    });
    expect(srReads).toBe(0);
  });

  it("TEST 8b: paid Check without an SR is receipt-incomplete, not unpaid", async () => {
    const result = await recoverCashierUnknownSettlement({
      restaurantId: 1,
      orderId: 55,
      readers: {
        readCheck: async () => paidCheck,
        readSettlementRecords: async () => [],
      },
    });
    expect(result.kind).toBe("PAYMENT_CONFIRMED_RECEIPT_INCOMPLETE");
    if (result.kind === "PAYMENT_CONFIRMED_RECEIPT_INCOMPLETE") {
      expect(result.paid.grandTotal).toBe("11.50");
      expect(result.paid.settlementRecordId).toBeNull();
    }
  });

  it("returns PAYMENT_UNKNOWN when Check read fails", async () => {
    const result = await recoverCashierUnknownSettlement({
      restaurantId: 1,
      orderId: 55,
      readers: {
        readCheck: async () => {
          throw new Error("timeout");
        },
        readSettlementRecords: async () => [settlementRecord],
      },
    });
    expect(result).toEqual({
      kind: "PAYMENT_UNKNOWN",
      reason: "check_read_failed",
    });
  });
});
