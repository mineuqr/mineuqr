/**
 * CHECK-GENERALIZATION-M4 — Session optionality for financial Check APIs.
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
  insertSettlementTransactions: vi.fn(),
  getOrdersByIds: vi.fn(),
  getRestaurantById: vi.fn(),
  getOrderById: vi.fn(),
  getDb: vi.fn(),
  listActiveOrderIdsForCheck: vi.fn(),
  findBlockingMembershipForOrder: vi.fn(),
  enrollOrderInCheck: vi.fn(),
  syncSessionOrdersToCheck: vi.fn(),
  deactivateMembershipsOnCheckVoid: vi.fn(),
  ensureOrderSettlementForEnrollment: vi.fn(),
  recalculateOrderSettlementsForCheck: vi.fn(),
  applyFullSettlementToCheckOrders: vi.fn(),
  applyComplimentaryToCheckOrders: vi.fn(),
  voidOrderSettlementsForCheck: vi.fn(),
  createSettlementRecordForCheckFinalize: vi.fn(),
  loadChargesSubtotal: vi.fn(),
  ensureOpenCheckChargeComposition: vi.fn(),
}));

const fakeTx = { __tx: true };

vi.mock("../../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

vi.mock("../../payment/dispatchBestEffortDownstreamDelivery", () => ({
  dispatchBestEffortDownstreamDelivery: () => undefined,
}));

vi.mock("../../../db", () => ({
  getOrdersByIds: (...a: unknown[]) => mocks.getOrdersByIds(...a),
  getRestaurantById: (...a: unknown[]) => mocks.getRestaurantById(...a),
  getOrderById: (...a: unknown[]) => mocks.getOrderById(...a),
  getOrderItemsByOrderId: vi.fn(async () => []),
  getDb: (...a: unknown[]) => mocks.getDb(...a),
}));

vi.mock("../checkOrderSettlementIntegration", () => ({
  ensureOrderSettlementForEnrollment: (...a: unknown[]) =>
    mocks.ensureOrderSettlementForEnrollment(...a),
  recalculateOrderSettlementsForCheck: (...a: unknown[]) =>
    mocks.recalculateOrderSettlementsForCheck(...a),
  applyFullSettlementToCheckOrders: (...a: unknown[]) =>
    mocks.applyFullSettlementToCheckOrders(...a),
  applyComplimentaryToCheckOrders: (...a: unknown[]) =>
    mocks.applyComplimentaryToCheckOrders(...a),
  voidOrderSettlementsForCheck: (...a: unknown[]) =>
    mocks.voidOrderSettlementsForCheck(...a),
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
  touchOpenCheck: vi.fn(async () => 1),
}));

vi.mock("../settlementTransactionRepository", () => ({
  insertSettlementTransactions: (...a: unknown[]) =>
    mocks.insertSettlementTransactions(...a),
  listSettlementTransactionsForCheck: vi.fn(async () => []),
}));

vi.mock("../checkMembershipService", () => ({
  syncSessionOrdersToCheck: (...a: unknown[]) =>
    mocks.syncSessionOrdersToCheck(...a),
  deactivateMembershipsOnCheckVoid: (...a: unknown[]) =>
    mocks.deactivateMembershipsOnCheckVoid(...a),
  enrollOrderInCheck: (...a: unknown[]) => mocks.enrollOrderInCheck(...a),
  CheckMembershipError: class CheckMembershipError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "CheckMembershipError";
    }
  },
}));

vi.mock("../checkOrderMembershipRepository", () => ({
  listActiveOrderIdsForCheck: (...a: unknown[]) =>
    mocks.listActiveOrderIdsForCheck(...a),
  findBlockingMembershipForOrder: (...a: unknown[]) =>
    mocks.findBlockingMembershipForOrder(...a),
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
  compensateChargesForCancelledOrder: vi.fn(),
  reconcileOpenOrderCharges: vi.fn(),
}));

vi.mock("../checkSettlementRecordIntegration", () => ({
  createSettlementRecordForCheckFinalize: (...a: unknown[]) =>
    mocks.createSettlementRecordForCheckFinalize(...a),
}));

import {
  createOpenCheck,
  ensureCheckForOrder,
  settleCashierPosOrderPaidByIdDetailed,
  settleCheckPaidById,
  settleCheckComplimentaryById,
  voidCheckById,
  recalculateOpenCheck,
} from "../CheckService";

const sessionlessOpenCheck = {
  id: 200,
  restaurantId: 1,
  sessionId: null,
  outcome: "open" as const,
  currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
  taxPolicySnapshot: {
    taxEnabled: false,
    taxMode: "exclusive" as const,
    rates: [],
  },
  subtotal: "0.00",
  taxAmount: "0.00",
  taxBreakdown: [],
  grandTotal: "0.00",
  billDiscountAmount: "0.00",
  snapshotsFrozenAt: "2026-07-22 10:00:00",
  totalsFrozenAt: null,
  settledAt: null,
  voidedAt: null,
  createdAt: "2026-07-22 10:00:00",
  updatedAt: "2026-07-22 10:00:00",
};

describe("CHECK-GENERALIZATION-M4 Session optionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRestaurantById.mockResolvedValue({
      id: 1,
      currencyCode: "SAR",
      currencySymbol: "ر.س",
    });
    mocks.enrollOrderInCheck.mockResolvedValue("enrolled");
    mocks.updateCheckMoney.mockResolvedValue(undefined);
    mocks.findSessionById.mockResolvedValue(null);
    mocks.getDb.mockResolvedValue({
      transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(fakeTx),
    });
    mocks.ensureOrderSettlementForEnrollment.mockResolvedValue({
      settlements: [],
      events: [],
      outcomes: ["applied"],
    });
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
      record: { settlementRecordId: "sr:1:200:settlement:1" },
      events: [],
      outcome: "applied",
    });
    mocks.ensureOpenCheckChargeComposition.mockResolvedValue(undefined);
    mocks.loadChargesSubtotal.mockResolvedValue("0.00");
  });

  it("createOpenCheck creates a sessionless Check without Session lookup", async () => {
    mocks.insertOperationalCheck.mockResolvedValue(200);
    mocks.findCheckById.mockResolvedValue(sessionlessOpenCheck);

    const check = await createOpenCheck({
      restaurantId: 1,
      sessionId: null,
    });

    expect(mocks.findSessionById).not.toHaveBeenCalled();
    expect(mocks.insertOperationalCheck).toHaveBeenCalledWith(
      expect.objectContaining({ restaurantId: 1, sessionId: null })
    );
    expect(check.sessionId).toBeNull();
  });

  it("ensureCheckForOrder creates sessionless Check, enrolls, recalculates", async () => {
    mocks.findBlockingMembershipForOrder.mockResolvedValue(null);
    mocks.insertOperationalCheck.mockResolvedValue(200);
    mocks.findCheckById.mockResolvedValue({
      ...sessionlessOpenCheck,
      subtotal: "10.00",
      grandTotal: "10.00",
    });
    mocks.listActiveOrderIdsForCheck.mockResolvedValue([55]);
    mocks.getOrdersByIds.mockResolvedValue([
      { id: 55, status: "pending", totalAmount: "10.00" },
    ]);

    const check = await ensureCheckForOrder({
      restaurantId: 1,
      orderId: 55,
    });

    expect(mocks.findSessionById).not.toHaveBeenCalled();
    expect(mocks.enrollOrderInCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        checkId: 200,
        orderId: 55,
        enrolledReason: "order_place",
      }),
      fakeTx,
      expect.objectContaining({
        count: expect.any(Number),
        insertMs: expect.any(Number),
      })
    );
    expect(mocks.ensureOrderSettlementForEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({ checkId: 200, orderId: 55 }),
      fakeTx
    );
    expect(check.id).toBe(200);
  });

  it("settleCheckPaidById freezes membership totals without Session", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(sessionlessOpenCheck)
      .mockResolvedValueOnce({
        ...sessionlessOpenCheck,
        outcome: "paid",
        totalsFrozenAt: "2026-07-22 11:00:00",
        settledAt: "2026-07-22 11:00:00",
        grandTotal: "10.00",
        subtotal: "10.00",
      });
    mocks.listActiveOrderIdsForCheck.mockResolvedValue([55]);
    mocks.getOrdersByIds.mockResolvedValue([
      { id: 55, status: "served", totalAmount: "10.00" },
    ]);
    mocks.finalizeCheckOutcome.mockResolvedValue(1);
    mocks.insertSettlementTransactions.mockResolvedValue(undefined);

    const result = await settleCheckPaidById({
      restaurantId: 1,
      checkId: 200,
    });

    expect(mocks.findSessionById).not.toHaveBeenCalled();
    expect(mocks.insertSettlementTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        checkId: 200,
        sessionId: null,
      }),
      fakeTx
    );
    expect(mocks.applyFullSettlementToCheckOrders).toHaveBeenCalledWith(
      { restaurantId: 1, checkId: 200 },
      fakeTx
    );
    expect(result.outcome).toBe("paid");
  });

  it("settleCheckComplimentaryById freezes without Session", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(sessionlessOpenCheck)
      .mockResolvedValueOnce({
        ...sessionlessOpenCheck,
        outcome: "complimentary",
        totalsFrozenAt: "2026-07-22 11:00:00",
        settledAt: "2026-07-22 11:00:00",
        grandTotal: "10.00",
        subtotal: "10.00",
      });
    mocks.listActiveOrderIdsForCheck.mockResolvedValue([55]);
    mocks.getOrdersByIds.mockResolvedValue([
      { id: 55, status: "served", totalAmount: "10.00" },
    ]);
    mocks.finalizeCheckOutcome.mockResolvedValue(1);
    mocks.insertSettlementTransactions.mockResolvedValue(undefined);

    const result = await settleCheckComplimentaryById({
      restaurantId: 1,
      checkId: 200,
    });

    expect(mocks.findSessionById).not.toHaveBeenCalled();
    expect(mocks.finalizeCheckOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "complimentary" }),
      fakeTx
    );
    expect(mocks.applyComplimentaryToCheckOrders).toHaveBeenCalledWith(
      { restaurantId: 1, checkId: 200 },
      fakeTx
    );
    expect(result.outcome).toBe("complimentary");
  });

  it("voidCheckById voids without Session and deactivates memberships", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(sessionlessOpenCheck)
      .mockResolvedValueOnce({
        ...sessionlessOpenCheck,
        outcome: "voided",
        voidedAt: "2026-07-22 11:00:00",
        totalsFrozenAt: "2026-07-22 11:00:00",
      });
    mocks.listActiveOrderIdsForCheck.mockResolvedValue([]);
    mocks.getOrdersByIds.mockResolvedValue([]);
    mocks.finalizeCheckOutcome.mockResolvedValue(1);

    await voidCheckById({ restaurantId: 1, checkId: 200 });

    expect(mocks.findSessionById).not.toHaveBeenCalled();
    expect(mocks.voidOrderSettlementsForCheck).toHaveBeenCalledWith(
      { restaurantId: 1, checkId: 200 },
      fakeTx
    );
    expect(mocks.deactivateMembershipsOnCheckVoid).toHaveBeenCalledWith(
      {
        restaurantId: 1,
        checkId: 200,
      },
      fakeTx
    );
  });

  it("recalculateOpenCheck uses Charges for sessionless Checks", async () => {
    mocks.findCheckById.mockResolvedValue({
      ...sessionlessOpenCheck,
      subtotal: "10.00",
      grandTotal: "10.00",
    });
    mocks.loadChargesSubtotal.mockResolvedValue("10.00");

    await recalculateOpenCheck({ restaurantId: 1, checkId: 200 });

    expect(mocks.ensureOpenCheckChargeComposition).toHaveBeenCalledWith(
      { restaurantId: 1, checkId: 200 },
      undefined
    );
    expect(mocks.loadChargesSubtotal).toHaveBeenCalledWith(
      { restaurantId: 1, checkId: 200 },
      undefined
    );
    expect(mocks.updateCheckMoney).toHaveBeenCalledWith(
      expect.objectContaining({ checkId: 200, subtotal: "10.00" }),
      undefined
    );
    expect(mocks.recalculateOrderSettlementsForCheck).toHaveBeenCalled();
  });
});

describe("ADR-ARCH-038 cashier_pos direct financial commit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRestaurantById.mockResolvedValue({
      id: 1,
      currencyCode: "SAR",
      currencySymbol: "ر.س",
      taxEnabled: false,
    });
    mocks.getDb.mockResolvedValue({
      transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(fakeTx),
    });
    mocks.enrollOrderInCheck.mockResolvedValue("enrolled");
    mocks.updateCheckMoney.mockResolvedValue(undefined);
    mocks.ensureOrderSettlementForEnrollment.mockResolvedValue({
      settlements: [],
      events: [],
      outcomes: ["applied"],
    });
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
    mocks.createSettlementRecordForCheckFinalize.mockResolvedValue({
      record: { settlementRecordId: "sr:1:200:settlement:1" },
      events: [],
      outcome: "applied",
    });
    mocks.ensureOpenCheckChargeComposition.mockResolvedValue(undefined);
    mocks.loadChargesSubtotal.mockResolvedValue("10.00");
    mocks.finalizeCheckOutcome.mockResolvedValue(1);
    mocks.insertSettlementTransactions.mockResolvedValue(undefined);
    mocks.insertOperationalCheck.mockResolvedValue(200);
    mocks.findCheckById.mockResolvedValue({
      ...sessionlessOpenCheck,
      subtotal: "10.00",
      grandTotal: "10.00",
    });
  });

  it("rejects non-cashier_pos orders", async () => {
    mocks.getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 1,
      orderingChannel: "kiosk",
      status: "pending",
    });
    await expect(
      settleCashierPosOrderPaidByIdDetailed({
        restaurantId: 1,
        orderId: 55,
        awaitAttribution: false,
      })
    ).rejects.toThrow(/cashier_pos/);
    expect(mocks.insertOperationalCheck).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant order ids", async () => {
    mocks.getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 2,
      orderingChannel: "cashier_pos",
      status: "pending",
    });
    await expect(
      settleCashierPosOrderPaidByIdDetailed({
        restaurantId: 1,
        orderId: 55,
        awaitAttribution: false,
      })
    ).rejects.toThrow(/Order not found/);
    expect(mocks.insertOperationalCheck).not.toHaveBeenCalled();
  });

  it("does not materialize a Check to commit cashier_pos Collection Fact", async () => {
    mocks.getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 1,
      orderingChannel: "cashier_pos",
      status: "preparing",
      totalAmount: "10.00",
    });
    let committed = false;
    const result = await settleCashierPosOrderPaidByIdDetailed({
      restaurantId: 1,
      orderId: 55,
      billDiscountAmount: "1.00",
      awaitAttribution: false,
      productionCollectionCommit: async (freeze) => {
        committed = true;
        expect(freeze.checkId).toBeNull();
        expect(freeze.orderId).toBe(55);
        expect(freeze.grandTotal).toBeTruthy();
      },
    });

    expect(committed).toBe(true);
    expect(mocks.insertOperationalCheck).not.toHaveBeenCalled();
    expect(mocks.finalizeCheckOutcome).not.toHaveBeenCalled();
    expect(result.settlementRecord.outcome).toBe("skipped");
    expect(result.check.id).toBe(0);
  });

  it("does not materialize a Check when Collection Fact commit fails", async () => {
    mocks.getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 1,
      orderingChannel: "cashier_pos",
      status: "preparing",
      totalAmount: "10.00",
    });

    await expect(
      settleCashierPosOrderPaidByIdDetailed({
        restaurantId: 1,
        orderId: 55,
        awaitAttribution: false,
        productionCollectionCommit: async () => {
          throw new Error("cf storage");
        },
      })
    ).rejects.toThrow("cf storage");
    expect(mocks.insertOperationalCheck).not.toHaveBeenCalled();
    expect(mocks.createSettlementRecordForCheckFinalize).not.toHaveBeenCalled();
  });
});
