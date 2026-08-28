/**
 * POST-PAYMENT-INCOMING-CHECK-RECOVERY-HARDENING-1
 * Incoming paid Orders reuse the existing Check finalizer. Recovery retries
 * Check work only. Collection Fact / Invoice / Order / Session stay unchanged.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ORDERING_CHANNEL_CASHIER_POS,
  ORDERING_CHANNEL_KIOSK,
  ORDERING_CHANNEL_QR,
  ORDERING_CHANNEL_TABLE_SESSION,
  ORDERING_CHANNEL_WAITER_TABLET,
} from "@shared/ordering-platform/orderingChannelRegistry";

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
  updateSessionActiveCheckId: vi.fn(),
  commitCollectionFact: vi.fn(),
  allocateCashierInvoiceForOrder: vi.fn(),
  closeSession: vi.fn(),
  createOrder: vi.fn(),
}));

const fakeTx = { __tx: true };

vi.mock("../../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

vi.mock("../../../db", () => ({
  getRestaurantById: (...a: unknown[]) => mocks.getRestaurantById(...a),
  getOrderById: (...a: unknown[]) => mocks.getOrderById(...a),
  getOrderItemsByOrderId: vi.fn(async () => []),
  getDb: (...a: unknown[]) => mocks.getDb(...a),
  getOrdersByIds: vi.fn(),
  createOrder: (...a: unknown[]) => mocks.createOrder(...a),
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
  updateSessionActiveCheckId: (...a: unknown[]) =>
    mocks.updateSessionActiveCheckId(...a),
}));

vi.mock("../../../diningSession/sessionService", () => ({
  closeSession: (...a: unknown[]) => mocks.closeSession(...a),
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
  listActiveOrderIdsForCheck: vi.fn(async () => [88]),
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
    collectionFactId: "pcf_incoming_1",
    amount: "10.00",
    discountAmount: "0.00",
  })),
  listProductionCollectionFactsForRefundAnchor: vi.fn(async () => []),
  listCollectionFactsByIds: vi.fn(async () => []),
}));

vi.mock("../../payment/collection-fact/CollectionFactService", () => ({
  commitCollectionFact: (...a: unknown[]) => mocks.commitCollectionFact(...a),
}));

vi.mock("../../../pos/cashier-invoice/cashierInvoiceRepository", () => ({
  allocateCashierInvoiceForOrder: (...a: unknown[]) =>
    mocks.allocateCashierInvoiceForOrder(...a),
}));

vi.mock("../../crmp/SettlementContextResolver", () => ({
  resolveSettlementContextForSettle: vi.fn(),
}));

import {
  completeCashierOperationalSettlementAfterCollectionFact,
  deliverCashierPosOperationalSettlementAfterPaid,
} from "../CheckService";

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

const incomingChannels = [
  ORDERING_CHANNEL_QR,
  ORDERING_CHANNEL_WAITER_TABLET,
  ORDERING_CHANNEL_KIOSK,
  ORDERING_CHANNEL_TABLE_SESSION,
  ORDERING_CHANNEL_CASHIER_POS,
] as const;

describe("POST-PAYMENT-INCOMING-CHECK-RECOVERY-HARDENING-1 finalizer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRestaurantById.mockResolvedValue({
      id: 1,
      currencyCode: "SAR",
      currencySymbol: "ر.س",
    });
    mocks.getOrderById.mockResolvedValue({
      id: 88,
      restaurantId: 1,
      orderingChannel: ORDERING_CHANNEL_QR,
      status: "preparing",
      totalAmount: "10.00",
      sessionId: 44,
      orderNumber: "T-009",
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
  });

  it.each(incomingChannels)(
    "finalizes an existing %s Order Check without a second CF, Invoice, Order, or Session mutation",
    async (channel) => {
      mocks.getOrderById.mockResolvedValue({
        id: 88,
        restaurantId: 1,
        orderingChannel: channel,
        status: "preparing",
        totalAmount: "10.00",
        sessionId: channel === ORDERING_CHANNEL_CASHIER_POS ? null : 44,
        orderNumber: "T-009",
      });

      await deliverCashierPosOperationalSettlementAfterPaid({
        restaurantId: 1,
        orderId: 88,
      });

      expect(mocks.insertOperationalCheck).toHaveBeenCalledWith(
        expect.objectContaining({ restaurantId: 1, sessionId: null }),
        fakeTx
      );
      expect(mocks.finalizeCheckOutcome).toHaveBeenCalledWith(
        expect.objectContaining({ checkId: 200, outcome: "paid" }),
        fakeTx
      );
      expect(mocks.commitCollectionFact).not.toHaveBeenCalled();
      expect(mocks.allocateCashierInvoiceForOrder).not.toHaveBeenCalled();
      expect(mocks.createOrder).not.toHaveBeenCalled();
      expect(mocks.closeSession).not.toHaveBeenCalled();
      expect(mocks.updateSessionActiveCheckId).not.toHaveBeenCalled();
      expect(mocks.getOrderById).toHaveBeenCalledWith(88);
    }
  );

  it("retries Incoming Check finalize after the first attempt fails without duplicating financial state", async () => {
    mocks.finalizeCheckOutcome
      .mockRejectedValueOnce(new Error("check failed"))
      .mockResolvedValueOnce(1);
    mocks.findBlockingMembershipForOrder
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        membership: { checkId: 200, restaurantId: 1, orderId: 88, active: 1 },
        checkOutcome: "open",
      });

    await expect(
      deliverCashierPosOperationalSettlementAfterPaid({
        restaurantId: 1,
        orderId: 88,
      })
    ).rejects.toThrow("check failed");

    await deliverCashierPosOperationalSettlementAfterPaid({
      restaurantId: 1,
      orderId: 88,
    });

    expect(mocks.insertOperationalCheck).toHaveBeenCalledTimes(1);
    expect(mocks.finalizeCheckOutcome).toHaveBeenCalledTimes(2);
    expect(mocks.commitCollectionFact).not.toHaveBeenCalled();
    expect(mocks.allocateCashierInvoiceForOrder).not.toHaveBeenCalled();
    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(mocks.closeSession).not.toHaveBeenCalled();
    expect(mocks.updateSessionActiveCheckId).not.toHaveBeenCalled();
  });

  it("no-ops an already-terminal Check and remains idempotent on repeat", async () => {
    mocks.findCheckById.mockResolvedValue({
      ...openCheck,
      outcome: "paid",
    });

    await completeCashierOperationalSettlementAfterCollectionFact({
      restaurantId: 1,
      checkId: 200,
    });
    await completeCashierOperationalSettlementAfterCollectionFact({
      restaurantId: 1,
      checkId: 200,
    });

    expect(mocks.finalizeCheckOutcome).not.toHaveBeenCalled();
    expect(mocks.insertSettlementTransactions).not.toHaveBeenCalled();
    expect(mocks.commitCollectionFact).not.toHaveBeenCalled();
    expect(mocks.allocateCashierInvoiceForOrder).not.toHaveBeenCalled();
    expect(mocks.closeSession).not.toHaveBeenCalled();
  });
});
