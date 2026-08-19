/**
 * BILL-FINANCIAL-LIFECYCLE-HARDENING-1 — terminal Bill lifecycle.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findSessionById: vi.fn(),
  findOpenCheckBySessionId: vi.fn(),
  findCheckById: vi.fn(),
  insertOperationalCheck: vi.fn(),
  updateSessionActiveCheckId: vi.fn(),
  updateCheckMoney: vi.fn(),
  finalizeCheckOutcome: vi.fn(),
  touchOpenCheck: vi.fn(),
  insertSettlementTransactions: vi.fn(),
  listSettlementTransactionsForCheck: vi.fn(),
  getOrdersByIds: vi.fn(),
  getRestaurantById: vi.fn(),
  getDb: vi.fn(),
  listActiveOrderIdsForCheck: vi.fn(),
  syncSessionOrdersToCheck: vi.fn(),
  deactivateMembershipsOnCheckVoid: vi.fn(),
  recalculateOrderSettlementsForCheck: vi.fn(),
  applyFullSettlementToCheckOrders: vi.fn(),
  applyComplimentaryToCheckOrders: vi.fn(),
  voidOrderSettlementsForCheck: vi.fn(),
  createSettlementRecordForCheckFinalize: vi.fn(),
  loadChargesSubtotal: vi.fn(),
  ensureOpenCheckChargeComposition: vi.fn(),
  reconcileOpenOrderCharges: vi.fn(),
  compensateChargesForCancelledOrder: vi.fn(),
}));

const fakeTx = { __tx: true };

vi.mock("../../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

vi.mock("../../../db", () => ({
  getOrdersByIds: (...a: unknown[]) => mocks.getOrdersByIds(...a),
  getRestaurantById: (...a: unknown[]) => mocks.getRestaurantById(...a),
  getDb: (...a: unknown[]) => mocks.getDb(...a),
}));

vi.mock("../checkOrderSettlementIntegration", () => ({
  recalculateOrderSettlementsForCheck: (...a: unknown[]) =>
    mocks.recalculateOrderSettlementsForCheck(...a),
  applyFullSettlementToCheckOrders: (...a: unknown[]) =>
    mocks.applyFullSettlementToCheckOrders(...a),
  applyComplimentaryToCheckOrders: (...a: unknown[]) =>
    mocks.applyComplimentaryToCheckOrders(...a),
  voidOrderSettlementsForCheck: (...a: unknown[]) =>
    mocks.voidOrderSettlementsForCheck(...a),
  ensureOrderSettlementForEnrollment: vi.fn(),
  ensureOrderSettlementsForCheck: vi.fn(),
  refundOrderSettlementsForCheck: vi.fn(),
  cancelOrderSettlementForOrder: vi.fn(),
  applyPartialSettlementForOrder: vi.fn(),
}));

vi.mock("../../../diningSession/sessionRepository", () => ({
  findSessionById: (...a: unknown[]) => mocks.findSessionById(...a),
  updateSessionActiveCheckId: (...a: unknown[]) =>
    mocks.updateSessionActiveCheckId(...a),
}));

vi.mock("../checkRepository", () => ({
  findOpenCheckBySessionId: (...a: unknown[]) =>
    mocks.findOpenCheckBySessionId(...a),
  findCheckById: (...a: unknown[]) => mocks.findCheckById(...a),
  insertOperationalCheck: (...a: unknown[]) => mocks.insertOperationalCheck(...a),
  updateCheckMoney: (...a: unknown[]) => mocks.updateCheckMoney(...a),
  finalizeCheckOutcome: (...a: unknown[]) => mocks.finalizeCheckOutcome(...a),
  touchOpenCheck: (...a: unknown[]) => mocks.touchOpenCheck(...a),
}));

vi.mock("../settlementTransactionRepository", () => ({
  insertSettlementTransactions: (...a: unknown[]) =>
    mocks.insertSettlementTransactions(...a),
  listSettlementTransactionsForCheck: (...a: unknown[]) =>
    mocks.listSettlementTransactionsForCheck(...a),
}));

vi.mock("../checkMembershipService", () => ({
  syncSessionOrdersToCheck: (...a: unknown[]) =>
    mocks.syncSessionOrdersToCheck(...a),
  deactivateMembershipsOnCheckVoid: (...a: unknown[]) =>
    mocks.deactivateMembershipsOnCheckVoid(...a),
}));

vi.mock("../checkOrderMembershipRepository", () => ({
  listActiveOrderIdsForCheck: (...a: unknown[]) =>
    mocks.listActiveOrderIdsForCheck(...a),
}));

vi.mock("../checkChargeComposition", () => ({
  loadChargesSubtotal: (...a: unknown[]) => mocks.loadChargesSubtotal(...a),
  ensureOpenCheckChargeComposition: (...a: unknown[]) =>
    mocks.ensureOpenCheckChargeComposition(...a),
  ensureOpenCheckChargesSubtotal: async (...a: unknown[]) => {
    await mocks.ensureOpenCheckChargeComposition(...a);
    return mocks.loadChargesSubtotal(...a);
  },
  snapshotChargesForEnrolledOrder: vi.fn(),
  compensateChargesForCancelledOrder: (...a: unknown[]) =>
    mocks.compensateChargesForCancelledOrder(...a),
  reconcileOpenOrderCharges: (...a: unknown[]) =>
    mocks.reconcileOpenOrderCharges(...a),
}));

vi.mock("../checkSettlementRecordIntegration", () => ({
  createSettlementRecordForCheckFinalize: (...a: unknown[]) =>
    mocks.createSettlementRecordForCheckFinalize(...a),
}));

import {
  applyCancelledOrderChargeCompensation,
  applyOpenOrderChargeReconciliation,
  CheckTransitionError,
  getCheckById,
  recalculateOpenCheck,
  settleCheckComplimentaryById,
  settleCheckPaidById,
  voidCheckById,
} from "../CheckService";

const openCheckRow = {
  id: 100,
  restaurantId: 1,
  sessionId: 10,
  outcome: "open" as const,
  currencySnapshotJson: { currencyCode: "SAR", currencySymbol: "ر.س" },
  taxPolicySnapshotJson: {
    version: 1,
    enabled: false,
    mode: "exclusive",
    components: [],
  },
  taxBreakdownJson: { lines: [] },
  subtotal: "10.00",
  taxAmount: "0.00",
  grandTotal: "10.00",
  billDiscountAmount: "0.00",
  snapshotsFrozenAt: "2026-08-19 10:00:00",
  totalsFrozenAt: null,
  settledAt: null,
  voidedAt: null,
  createdAt: "2026-08-19 10:00:00",
  updatedAt: "2026-08-19 10:00:00",
};

function terminalRow(outcome: "paid" | "complimentary" | "voided") {
  return {
    ...openCheckRow,
    outcome,
    totalsFrozenAt: "2026-08-19 11:00:00",
    settledAt: outcome === "voided" ? null : "2026-08-19 11:00:00",
    voidedAt: outcome === "voided" ? "2026-08-19 11:00:00" : null,
  };
}

describe("BILL-FINANCIAL-LIFECYCLE-HARDENING-1 CheckService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRestaurantById.mockResolvedValue({
      id: 1,
      currencyCode: "SAR",
      currencySymbol: "ر.س",
    });
    mocks.getDb.mockResolvedValue({
      transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(fakeTx),
    });
    mocks.touchOpenCheck.mockResolvedValue(1);
    mocks.loadChargesSubtotal.mockResolvedValue("10.00");
    mocks.ensureOpenCheckChargeComposition.mockResolvedValue(undefined);
    mocks.finalizeCheckOutcome.mockResolvedValue(1);
    mocks.insertSettlementTransactions.mockResolvedValue(undefined);
    mocks.listSettlementTransactionsForCheck.mockResolvedValue([]);
    mocks.updateCheckMoney.mockResolvedValue(undefined);
    mocks.recalculateOrderSettlementsForCheck.mockResolvedValue({
      settlements: [],
      events: [],
      outcomes: [],
    });
    mocks.applyFullSettlementToCheckOrders.mockResolvedValue({
      settlements: [],
      events: [],
      outcomes: ["applied"],
    });
    mocks.applyComplimentaryToCheckOrders.mockResolvedValue({
      settlements: [],
      events: [],
      outcomes: ["applied"],
    });
    mocks.voidOrderSettlementsForCheck.mockResolvedValue({
      settlements: [],
      events: [],
      outcomes: ["applied"],
    });
    mocks.createSettlementRecordForCheckFinalize.mockResolvedValue({
      record: { settlementRecordId: "sr:1:100:settlement:1" },
      events: [],
      outcome: "applied",
    });
    mocks.deactivateMembershipsOnCheckVoid.mockResolvedValue(undefined);
  });

  it("OPEN → PAID freezes Charge-derived money", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheckRow)
      .mockResolvedValueOnce(terminalRow("paid"));
    const result = await settleCheckPaidById({ restaurantId: 1, checkId: 100 });
    expect(result.outcome).toBe("paid");
    expect(mocks.touchOpenCheck).toHaveBeenCalledWith(
      { checkId: 100, restaurantId: 1 },
      fakeTx
    );
    expect(mocks.finalizeCheckOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "paid", grandTotal: "10.00" }),
      fakeTx
    );
    expect(mocks.getOrdersByIds).not.toHaveBeenCalled();
  });

  it("OPEN → COMPLIMENTARY is a terminal financial outcome", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheckRow)
      .mockResolvedValueOnce(terminalRow("complimentary"));
    const result = await settleCheckComplimentaryById({
      restaurantId: 1,
      checkId: 100,
    });
    expect(result.outcome).toBe("complimentary");
    expect(mocks.finalizeCheckOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "complimentary" }),
      fakeTx
    );
  });

  it("OPEN → VOIDED is a terminal financial outcome", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheckRow)
      .mockResolvedValueOnce(terminalRow("voided"));
    const result = await voidCheckById({ restaurantId: 1, checkId: 100 });
    expect(result.outcome).toBe("voided");
    expect(mocks.finalizeCheckOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "voided" }),
      fakeTx
    );
  });

  it.each([
    ["paid", settleCheckPaidById],
    ["complimentary", settleCheckComplimentaryById],
    ["voided", voidCheckById],
  ] as const)("rejects %s → OPEN / any other finalize", async (outcome, command) => {
    mocks.findCheckById.mockResolvedValue(terminalRow(outcome));
    await expect(command({ restaurantId: 1, checkId: 100 })).rejects.toBeInstanceOf(
      CheckTransitionError
    );
    expect(mocks.finalizeCheckOutcome).not.toHaveBeenCalled();
    expect(mocks.touchOpenCheck).not.toHaveBeenCalled();
  });

  it("PAID → VOIDED is rejected", async () => {
    mocks.findCheckById.mockResolvedValue(terminalRow("paid"));
    await expect(
      voidCheckById({ restaurantId: 1, checkId: 100 })
    ).rejects.toBeInstanceOf(CheckTransitionError);
  });

  it("PAID → COMPLIMENTARY is rejected", async () => {
    mocks.findCheckById.mockResolvedValue(terminalRow("paid"));
    await expect(
      settleCheckComplimentaryById({ restaurantId: 1, checkId: 100 })
    ).rejects.toBeInstanceOf(CheckTransitionError);
  });

  it("COMPLIMENTARY → PAID is rejected", async () => {
    mocks.findCheckById.mockResolvedValue(terminalRow("complimentary"));
    await expect(
      settleCheckPaidById({ restaurantId: 1, checkId: 100 })
    ).rejects.toBeInstanceOf(CheckTransitionError);
  });

  it("COMPLIMENTARY → VOIDED is rejected", async () => {
    mocks.findCheckById.mockResolvedValue(terminalRow("complimentary"));
    await expect(
      voidCheckById({ restaurantId: 1, checkId: 100 })
    ).rejects.toBeInstanceOf(CheckTransitionError);
  });

  it("VOIDED → PAID is rejected", async () => {
    mocks.findCheckById.mockResolvedValue(terminalRow("voided"));
    await expect(
      settleCheckPaidById({ restaurantId: 1, checkId: 100 })
    ).rejects.toBeInstanceOf(CheckTransitionError);
  });

  it("VOIDED → COMPLIMENTARY is rejected", async () => {
    mocks.findCheckById.mockResolvedValue(terminalRow("voided"));
    await expect(
      settleCheckComplimentaryById({ restaurantId: 1, checkId: 100 })
    ).rejects.toBeInstanceOf(CheckTransitionError);
  });

  it("explicit Charge correction on a terminal Bill throws", async () => {
    mocks.reconcileOpenOrderCharges.mockResolvedValue({
      checkId: 100,
      applied: false,
      blocked: "terminal",
    });
    await expect(
      applyOpenOrderChargeReconciliation({ restaurantId: 1, orderId: 55 })
    ).rejects.toBeInstanceOf(CheckTransitionError);
    expect(mocks.updateCheckMoney).not.toHaveBeenCalled();
  });

  it("Order cancel compensation does not reopen or mutate a terminal Bill", async () => {
    mocks.compensateChargesForCancelledOrder.mockResolvedValue({
      checkId: 100,
      compensated: false,
    });
    const result = await applyCancelledOrderChargeCompensation({
      restaurantId: 1,
      orderId: 55,
    });
    expect(result.compensated).toBe(false);
    expect(mocks.finalizeCheckOutcome).not.toHaveBeenCalled();
    expect(mocks.updateCheckMoney).not.toHaveBeenCalled();
  });

  it("recalculate on a terminal Bill returns the frozen Check", async () => {
    mocks.findCheckById.mockResolvedValue(terminalRow("paid"));
    const result = await recalculateOpenCheck({
      restaurantId: 1,
      checkId: 100,
    });
    expect(result?.outcome).toBe("paid");
    expect(mocks.updateCheckMoney).not.toHaveBeenCalled();
    expect(mocks.ensureOpenCheckChargeComposition).not.toHaveBeenCalled();
  });

  it("finalize reloads Charges inside the TX so a later Charge wins the money", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheckRow)
      .mockResolvedValueOnce(terminalRow("paid"));
    mocks.loadChargesSubtotal
      .mockResolvedValueOnce("10.00")
      .mockResolvedValueOnce("25.00");
    await settleCheckPaidById({ restaurantId: 1, checkId: 100 });
    expect(mocks.loadChargesSubtotal).toHaveBeenNthCalledWith(2, {
      restaurantId: 1,
      checkId: 100,
    }, fakeTx);
    expect(mocks.finalizeCheckOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ grandTotal: "25.00" }),
      fakeTx
    );
  });

  it("Charge + terminal race: lost OPEN lock rejects Charge-derived finalize", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheckRow)
      .mockResolvedValueOnce(terminalRow("voided"));
    mocks.touchOpenCheck.mockResolvedValue(0);
    await expect(
      settleCheckPaidById({ restaurantId: 1, checkId: 100 })
    ).rejects.toBeInstanceOf(CheckTransitionError);
    expect(mocks.finalizeCheckOutcome).not.toHaveBeenCalled();
    expect(mocks.createSettlementRecordForCheckFinalize).not.toHaveBeenCalled();
  });

  it("PAID + VOID race: loser of the OPEN row fails deterministically", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheckRow)
      .mockResolvedValueOnce(terminalRow("paid"));
    mocks.touchOpenCheck.mockResolvedValue(0);
    await expect(
      voidCheckById({ restaurantId: 1, checkId: 100 })
    ).rejects.toMatchObject({
      name: "CheckTransitionError",
      message: expect.stringContaining("paid"),
    });
  });

  it("PAID + COMPLIMENTARY race: loser fails after OPEN lock is lost", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheckRow)
      .mockResolvedValueOnce(terminalRow("paid"));
    mocks.touchOpenCheck.mockResolvedValue(0);
    await expect(
      settleCheckComplimentaryById({ restaurantId: 1, checkId: 100 })
    ).rejects.toBeInstanceOf(CheckTransitionError);
    expect(mocks.applyComplimentaryToCheckOrders).not.toHaveBeenCalled();
  });

  it("duplicate PAID is a deterministic CheckTransitionError", async () => {
    mocks.findCheckById.mockResolvedValue(terminalRow("paid"));
    await expect(
      settleCheckPaidById({ restaurantId: 1, checkId: 100 })
    ).rejects.toThrow(/Cannot finalize check from outcome paid/);
  });

  it("duplicate VOID is a deterministic CheckTransitionError", async () => {
    mocks.findCheckById.mockResolvedValue(terminalRow("voided"));
    await expect(voidCheckById({ restaurantId: 1, checkId: 100 })).rejects.toThrow(
      /Cannot finalize check from outcome voided/
    );
  });

  it("duplicate COMPLIMENTARY is a deterministic CheckTransitionError", async () => {
    mocks.findCheckById.mockResolvedValue(terminalRow("complimentary"));
    await expect(
      settleCheckComplimentaryById({ restaurantId: 1, checkId: 100 })
    ).rejects.toThrow(/Cannot finalize check from outcome complimentary/);
  });

  it("cross-tenant Bill transition is rejected", async () => {
    mocks.findCheckById.mockResolvedValue({
      ...openCheckRow,
      restaurantId: 9,
    });
    await expect(
      settleCheckPaidById({ restaurantId: 1, checkId: 100 })
    ).rejects.toThrow(/Check not found/);
    expect(mocks.finalizeCheckOutcome).not.toHaveBeenCalled();
  });

  it("cross-tenant Check read is null", async () => {
    mocks.findCheckById.mockResolvedValue({
      ...openCheckRow,
      restaurantId: 9,
    });
    await expect(getCheckById({ restaurantId: 1, checkId: 100 })).resolves.toBeNull();
  });

  it("PAID collection amount is Bill remaining, not Order total", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheckRow)
      .mockResolvedValueOnce(terminalRow("paid"));
    mocks.listSettlementTransactionsForCheck.mockResolvedValue([]);
    await settleCheckPaidById({
      restaurantId: 1,
      checkId: 100,
      settlements: [{ paymentMethod: "cash", amount: "10.00" }],
    });
    expect(mocks.getOrdersByIds).not.toHaveBeenCalled();
    expect(mocks.insertSettlementTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        currencyCode: "SAR",
        lines: [expect.objectContaining({ paymentMethod: "cash", amount: "10.00" })],
      }),
      fakeTx
    );
  });

  it("rejects overpayment against Bill amountDue", async () => {
    mocks.findCheckById.mockResolvedValue(openCheckRow);
    await expect(
      settleCheckPaidById({
        restaurantId: 1,
        checkId: 100,
        settlements: [{ paymentMethod: "cash", amount: "99.00" }],
      })
    ).rejects.toThrow(/must equal Check grandTotal/);
    expect(mocks.finalizeCheckOutcome).not.toHaveBeenCalled();
  });

  it("rejects zero-amount collection", async () => {
    mocks.findCheckById.mockResolvedValue(openCheckRow);
    await expect(
      settleCheckPaidById({
        restaurantId: 1,
        checkId: 100,
        settlements: [{ paymentMethod: "cash", amount: "0.00" }],
      })
    ).rejects.toThrow(/must be positive/);
  });

  it("if captured collection already exists, remaining due is Bill minus collection", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce({
        ...openCheckRow,
        subtotal: "10.00",
        grandTotal: "10.00",
      })
      .mockResolvedValueOnce(terminalRow("paid"));
    mocks.listSettlementTransactionsForCheck.mockResolvedValue([
      {
        amount: "4.00",
        status: "captured",
        paymentMethod: "cash",
      },
    ]);
    await settleCheckPaidById({
      restaurantId: 1,
      checkId: 100,
      settlements: [{ paymentMethod: "card", amount: "6.00" }],
    });
    expect(mocks.insertSettlementTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [expect.objectContaining({ paymentMethod: "card", amount: "6.00" })],
      }),
      fakeTx
    );
  });

  it("complimentary settlement lines are not treated as Payment collection", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheckRow)
      .mockResolvedValueOnce(terminalRow("complimentary"));
    await settleCheckComplimentaryById({ restaurantId: 1, checkId: 100 });
    expect(mocks.insertSettlementTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          expect.objectContaining({
            paymentMethod: "complimentary",
            amount: "10.00",
          }),
        ],
      }),
      fakeTx
    );
  });
});
