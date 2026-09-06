/**
 * CASHIER-COLLECTION-FACT-CRITICAL-PATH-DECOUPLING-1
 * HTTP success is Collection Fact commit. ST / OS / SR must not block it.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findCheckById: vi.fn(),
  insertOperationalCheck: vi.fn(),
  updateCheckMoney: vi.fn(),
  finalizeCheckOutcome: vi.fn(),
  insertSettlementTransactions: vi.fn(),
  getRestaurantById: vi.fn(),
  getOrderById: vi.fn(),
  getDb: vi.fn(),
  findBlockingMembershipForOrder: vi.fn(),
  enrollOrderInCheck: vi.fn(),
  ensureOrderSettlementForEnrollment: vi.fn(),
  recalculateOrderSettlementsForCheck: vi.fn(),
  applyFullSettlementToCheckOrders: vi.fn(),
  createSettlementRecordForCheckFinalize: vi.fn(),
  loadChargesSubtotal: vi.fn(),
  ensureOpenCheckChargeComposition: vi.fn(),
  listCheckCharges: vi.fn(),
  opsLog: vi.fn(),
  dispatchDownstream: { current: true },
  adoptSettlementAttributionAfterFinalize: vi.fn(),
}));

const fakeTx = { __tx: true };

vi.mock("../../../_core/opsLog", () => ({
  opsLog: (...a: unknown[]) => mocks.opsLog(...a),
}));

vi.mock("../../../db", () => ({
  getRestaurantById: (...a: unknown[]) => mocks.getRestaurantById(...a),
  getOrderById: (...a: unknown[]) => mocks.getOrderById(...a),
  getOrderItemsByOrderId: vi.fn(async () => []),
  getDb: (...a: unknown[]) => mocks.getDb(...a),
  getOrdersByIds: vi.fn(),
}));

vi.mock("../checkOrderSettlementIntegration", () => ({
  ensureOrderSettlementForEnrollment: (...a: unknown[]) =>
    mocks.ensureOrderSettlementForEnrollment(...a),
  recalculateOrderSettlementsForCheck: (...a: unknown[]) =>
    mocks.recalculateOrderSettlementsForCheck(...a),
  applyFullSettlementToCheckOrders: (...a: unknown[]) =>
    mocks.applyFullSettlementToCheckOrders(...a),
  applyComplimentaryToCheckOrders: vi.fn(),
  voidOrderSettlementsForCheck: vi.fn(),
  ensureOrderSettlementsForCheck: vi.fn(),
  refundOrderSettlementsForCheck: vi.fn(),
  cancelOrderSettlementForOrder: vi.fn(),
  applyPartialSettlementForOrder: vi.fn(),
}));

vi.mock("../../../diningSession/sessionRepository", () => ({
  findSessionById: vi.fn(),
  updateSessionActiveCheckId: vi.fn(),
}));

vi.mock("../checkRepository", () => ({
  findOpenCheckBySessionId: vi.fn(),
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
  enrollOrderInCheck: (...a: unknown[]) => mocks.enrollOrderInCheck(...a),
  syncSessionOrdersToCheck: vi.fn(),
  deactivateMembershipsOnCheckVoid: vi.fn(),
  CheckMembershipError: class CheckMembershipError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "CheckMembershipError";
    }
  },
}));

vi.mock("../checkOrderMembershipRepository", () => ({
  listActiveOrderIdsForCheck: vi.fn(async () => [55]),
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

vi.mock("../checkChargeRepository", () => ({
  listCheckCharges: (...a: unknown[]) => mocks.listCheckCharges(...a),
}));

vi.mock("../checkSettlementRecordIntegration", () => ({
  createSettlementRecordForCheckFinalize: (...a: unknown[]) =>
    mocks.createSettlementRecordForCheckFinalize(...a),
}));

vi.mock("../../payment/collection-fact/collectionFactRepository", () => ({
  findProductionCollectionFactByOrderId: vi.fn(async () => ({
    collectionFactId: "pcf_1",
    amount: "10.00",
    discountAmount: "0.00",
  })),
  listProductionCollectionFactsForRefundAnchor: vi.fn(async () => []),
  listCollectionFactsByIds: vi.fn(async () => []),
}));

vi.mock("../checkSettlementAttributionAdoption", () => ({
  adoptSettlementAttributionAfterFinalize: (...a: unknown[]) =>
    mocks.adoptSettlementAttributionAfterFinalize(...a),
  adoptRefundAttributionAfterFinalize: vi.fn(),
}));

vi.mock("../../payment/dispatchBestEffortDownstreamDelivery", () => ({
  dispatchBestEffortDownstreamDelivery: (input: {
    delivery: () => Promise<void>;
    onFailure: (error: unknown) => void;
  }) => {
    if (!mocks.dispatchDownstream.current) return;
    void input.delivery().catch(input.onFailure);
  },
}));

vi.mock("../../../compliance/dispatchComplianceAfterProductionCollectionFact", () => ({
  dispatchComplianceAfterProductionCollectionFact: (
    _input: unknown,
    options?: {
      afterCompliance?: () => Promise<void>;
      onAfterComplianceFailure?: (error: unknown) => void;
    }
  ) => {
    if (!mocks.dispatchDownstream.current) return;
    void (async () => {
      try {
        if (options?.afterCompliance) await options.afterCompliance();
      } catch (error) {
        options?.onAfterComplianceFailure?.(error);
      }
    })();
  },
}));

vi.mock("../../crmp/SettlementContextResolver", () => ({
  resolveSettlementContextForSettle: vi.fn(),
}));

import {
  completeCashierOperationalSettlementAfterCollectionFact,
  settleCashierPosOrderPaidByIdDetailed,
} from "../CheckService";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import { OPS_EVENT } from "../../../_core/opsTaxonomy";

const openCheck = {
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
  subtotal: "10.00",
  taxAmount: "0.00",
  taxBreakdown: [],
  grandTotal: "10.00",
  billDiscountAmount: "0.00",
  snapshotsFrozenAt: "2026-08-20 10:00:00",
  totalsFrozenAt: null,
  settledAt: null,
  voidedAt: null,
  createdAt: "2026-08-20 10:00:00",
  updatedAt: "2026-08-20 10:00:00",
};

describe("CASHIER-COLLECTION-FACT-CRITICAL-PATH-DECOUPLING-1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dispatchDownstream.current = true;
    mocks.getRestaurantById.mockResolvedValue({
      id: 1,
      currencyCode: "SAR",
      currencySymbol: "ر.س",
    });
    mocks.getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 1,
      orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
      status: "preparing",
      totalAmount: "10.00",
    });
    mocks.findBlockingMembershipForOrder.mockResolvedValue(null);
    mocks.insertOperationalCheck.mockResolvedValue(200);
    mocks.findCheckById.mockResolvedValue(openCheck);
    mocks.updateCheckMoney.mockResolvedValue(undefined);
    mocks.enrollOrderInCheck.mockResolvedValue("enrolled");
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
    mocks.createSettlementRecordForCheckFinalize.mockResolvedValue({
      record: { settlementRecordId: "sr:1:200:settlement:1" },
      events: [],
      outcome: "applied",
    });
    mocks.ensureOpenCheckChargeComposition.mockResolvedValue(undefined);
    mocks.loadChargesSubtotal.mockResolvedValue("10.00");
    mocks.listCheckCharges.mockResolvedValue([]);
    mocks.finalizeCheckOutcome.mockResolvedValue(1);
    mocks.insertSettlementTransactions.mockResolvedValue(undefined);
    mocks.adoptSettlementAttributionAfterFinalize.mockResolvedValue({
      attribution: {
        outcome: "created",
        attributionId: "attr_test",
        settlementRecordId: null,
        collectionFactId: "pcf_1",
        registerId: "reg_1",
        financialShiftId: "fsh_1",
        operatorUserId: 10,
        cashTenderAmount: "10.00",
        gaps: [],
        reason: null,
      },
      events: [],
    });
  });

  it("returns after Collection Fact without waiting for a hanging ST write", async () => {
    mocks.dispatchDownstream.current = false;
    const committed: string[] = [];

    const result = await settleCashierPosOrderPaidByIdDetailed({
      restaurantId: 1,
      orderId: 55,
      awaitAttribution: false,
      deferOperationalSettlementAfterCollectionFact: true,
      productionCollectionCommit: async () => {
        committed.push("cf");
      },
    });

    expect(committed).toEqual(["cf"]);
    expect(result.settlementRecord.record).toBeNull();
    expect(result.settlementRecord.outcome).toBe("skipped");
  });

  it("keeps Collection Fact success when downstream ST fails", async () => {
    mocks.insertSettlementTransactions.mockRejectedValue(new Error("st down"));

    const result = await settleCashierPosOrderPaidByIdDetailed({
      restaurantId: 1,
      orderId: 55,
      awaitAttribution: false,
      deferOperationalSettlementAfterCollectionFact: true,
      productionCollectionCommit: async () => undefined,
    });

    expect(result.settlementRecord.record).toBeNull();
    await vi.waitFor(() => {
      expect(mocks.opsLog).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OPS_EVENT.check_operational_settlement_deferred_failed,
          metadata: expect.objectContaining({
            error: "st down",
          }),
        })
      );
    });
  });

  it("keeps Collection Fact success when downstream OS fails", async () => {
    mocks.applyFullSettlementToCheckOrders.mockRejectedValue(
      new Error("os down")
    );

    const result = await settleCashierPosOrderPaidByIdDetailed({
      restaurantId: 1,
      orderId: 55,
      awaitAttribution: false,
      deferOperationalSettlementAfterCollectionFact: true,
      productionCollectionCommit: async () => undefined,
    });

    expect(result.settlementRecord.record).toBeNull();
    await vi.waitFor(() => {
      expect(mocks.opsLog).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OPS_EVENT.check_operational_settlement_deferred_failed,
          metadata: expect.objectContaining({ error: "os down" }),
        })
      );
    });
  });

  it("keeps Collection Fact success when downstream SR fails", async () => {
    mocks.createSettlementRecordForCheckFinalize.mockRejectedValue(
      new Error("sr down")
    );

    const result = await settleCashierPosOrderPaidByIdDetailed({
      restaurantId: 1,
      orderId: 55,
      awaitAttribution: false,
      deferOperationalSettlementAfterCollectionFact: true,
      productionCollectionCommit: async () => undefined,
    });

    expect(result.settlementRecord.record).toBeNull();
    await vi.waitFor(() => {
      expect(mocks.opsLog).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OPS_EVENT.check_operational_settlement_deferred_failed,
          metadata: expect.objectContaining({ error: "sr down" }),
        })
      );
    });
  });

  it("retries downstream operational settlement without a second Collection Fact", async () => {
    const commits: number[] = [];
    mocks.insertSettlementTransactions
      .mockRejectedValueOnce(new Error("st down"))
      .mockResolvedValueOnce(undefined);

    await settleCashierPosOrderPaidByIdDetailed({
      restaurantId: 1,
      orderId: 55,
      awaitAttribution: false,
      deferOperationalSettlementAfterCollectionFact: true,
      productionCollectionCommit: async () => {
        commits.push(1);
      },
    });

    await vi.waitFor(() => {
      expect(mocks.opsLog).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OPS_EVENT.check_operational_settlement_deferred_failed,
        })
      );
    });

    await completeCashierOperationalSettlementAfterCollectionFact({
      restaurantId: 1,
      checkId: 200,
    });

    expect(commits).toHaveLength(1);
    expect(mocks.insertSettlementTransactions).toHaveBeenCalledTimes(2);
    expect(mocks.createSettlementRecordForCheckFinalize).toHaveBeenCalled();
  });

  it("returns concurrent Confirms without waiting for ST", async () => {
    mocks.dispatchDownstream.current = false;
    const started = Date.now();
    const [first, second] = await Promise.all([
      settleCashierPosOrderPaidByIdDetailed({
        restaurantId: 1,
        orderId: 55,
        awaitAttribution: false,
        deferOperationalSettlementAfterCollectionFact: true,
        productionCollectionCommit: async () => undefined,
      }),
      settleCashierPosOrderPaidByIdDetailed({
        restaurantId: 1,
        orderId: 55,
        awaitAttribution: false,
        deferOperationalSettlementAfterCollectionFact: true,
        productionCollectionCommit: async () => undefined,
      }),
    ]);
    expect(Date.now() - started).toBeLessThan(1000);
    expect(first.settlementRecord.outcome).toBe("skipped");
    expect(second.settlementRecord.outcome).toBe("skipped");
    expect(first.check.id).toBe(0);
    expect(second.check.id).toBe(0);
  });

  it("does not report financial success when Collection Fact commit throws", async () => {
    mocks.dispatchDownstream.current = false;
    await expect(
      settleCashierPosOrderPaidByIdDetailed({
        restaurantId: 1,
        orderId: 55,
        awaitAttribution: false,
        deferOperationalSettlementAfterCollectionFact: true,
        productionCollectionCommit: async () => {
          throw new Error("cf storage");
        },
      })
    ).rejects.toThrow("cf storage");
    expect(mocks.finalizeCheckOutcome).not.toHaveBeenCalled();
    expect(mocks.insertOperationalCheck).not.toHaveBeenCalled();
    expect(mocks.insertSettlementTransactions).not.toHaveBeenCalled();
  });

  it("does not attribute CRMP immediately after Collection Fact", async () => {
    mocks.dispatchDownstream.current = false;
    const fact = {
      collectionFactId: "pcf_incoming",
      restaurantId: 1,
      orderId: 55,
      paymentIntentId: "pi_1",
      purpose: "production",
      amount: "10.00",
      discountAmount: "0.00",
      currencyCode: "SAR",
      tenders: [{ paymentMethod: "cash" as const, amount: "10.00" }],
      checkId: null,
      committedAt: "2026-08-28T00:00:00.000Z",
      businessDay: "2026-08-28",
      actorId: "10",
      terminalId: "term_1",
      orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
    };

    const result = await settleCashierPosOrderPaidByIdDetailed({
      restaurantId: 1,
      orderId: 55,
      awaitAttribution: true,
      deferOperationalSettlementAfterCollectionFact: true,
      productionCollectionCommit: async () => ({ fact }),
    });

    expect(result.check.id).toBe(0);
    expect(result.settlementAttribution.outcome).toBe("skipped");
    expect(result.settlementAttribution.gaps).toContain("deferred_post_commit");
    expect(mocks.adoptSettlementAttributionAfterFinalize).not.toHaveBeenCalled();
  });

  it("reaches canonical CRMP once through Check finalization", async () => {
    mocks.findCheckById
      .mockResolvedValueOnce(openCheck)
      .mockResolvedValueOnce(openCheck)
      .mockResolvedValueOnce({ ...openCheck, outcome: "paid" });

    await completeCashierOperationalSettlementAfterCollectionFact({
      restaurantId: 1,
      checkId: 200,
    });

    expect(mocks.finalizeCheckOutcome).toHaveBeenCalled();
    expect(mocks.adoptSettlementAttributionAfterFinalize).toHaveBeenCalledTimes(1);
  });
});
