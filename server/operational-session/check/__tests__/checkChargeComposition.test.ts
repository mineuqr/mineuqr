/**
 * BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 — composition unit tests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findCheckById: vi.fn(),
  touchOpenCheck: vi.fn(),
  listCheckCharges: vi.fn(),
  nextCheckChargeSequence: vi.fn(),
  insertCheckCharge: vi.fn(),
  getOrderById: vi.fn(),
  getOrderItemsByOrderId: vi.fn(),
  findBlockingMembershipForOrder: vi.fn(),
  listActiveOrderIdsForCheck: vi.fn(),
}));

vi.mock("../checkRepository", () => ({
  findCheckById: (...a: unknown[]) => mocks.findCheckById(...a),
  touchOpenCheck: (...a: unknown[]) => mocks.touchOpenCheck(...a),
}));

vi.mock("../checkChargeRepository", () => ({
  listCheckCharges: (...a: unknown[]) => mocks.listCheckCharges(...a),
  nextCheckChargeSequence: (...a: unknown[]) => mocks.nextCheckChargeSequence(...a),
  insertCheckCharge: (...a: unknown[]) => mocks.insertCheckCharge(...a),
}));

vi.mock("../../../db", () => ({
  getOrderById: (...a: unknown[]) => mocks.getOrderById(...a),
  getOrderItemsByOrderId: (...a: unknown[]) => mocks.getOrderItemsByOrderId(...a),
}));

vi.mock("../checkOrderMembershipRepository", () => ({
  findBlockingMembershipForOrder: (...a: unknown[]) =>
    mocks.findBlockingMembershipForOrder(...a),
  listActiveOrderIdsForCheck: (...a: unknown[]) =>
    mocks.listActiveOrderIdsForCheck(...a),
}));

import {
  compensateChargesForCancelledOrder,
  ensureOpenCheckChargeComposition,
  loadChargesSubtotal,
  reconcileOpenOrderCharges,
  snapshotChargesForEnrolledOrder,
} from "../checkChargeComposition";
import { ChargeCompositionError } from "@shared/operational-session";

const openCheckRow = {
  id: 10,
  restaurantId: 1,
  outcome: "open",
  currencySnapshotJson: { currencyCode: "SAR", currencySymbol: "ر.س" },
};

describe("checkChargeComposition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listCheckCharges.mockResolvedValue([]);
    mocks.nextCheckChargeSequence.mockResolvedValue(1);
    mocks.insertCheckCharge.mockResolvedValue(undefined);
    mocks.listActiveOrderIdsForCheck.mockResolvedValue([]);
    mocks.getOrderItemsByOrderId.mockResolvedValue([]);
    mocks.touchOpenCheck.mockResolvedValue(1);
  });

  it("loadChargesSubtotal sums persisted Charges only", async () => {
    mocks.listCheckCharges.mockResolvedValue([
      { netAmount: "10.00" },
      { netAmount: "5.50" },
    ]);
    await expect(
      loadChargesSubtotal({ restaurantId: 1, checkId: 10 })
    ).resolves.toBe("15.50");
    expect(mocks.getOrderById).not.toHaveBeenCalled();
  });

  it("does not add Charges to a terminal Check", async () => {
    mocks.findCheckById.mockResolvedValue({
      ...openCheckRow,
      outcome: "paid",
    });
    await snapshotChargesForEnrolledOrder({
      restaurantId: 1,
      checkId: 10,
      orderId: 55,
    });
    expect(mocks.insertCheckCharge).not.toHaveBeenCalled();
  });

  it("snapshots order items once for an enrolled origin", async () => {
    mocks.findCheckById.mockResolvedValue(openCheckRow);
    mocks.getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 1,
      status: "pending",
      orderNumber: "ORD-1",
      orderingChannel: "qr",
      totalAmount: "12.00",
    });
    mocks.getOrderItemsByOrderId.mockResolvedValue([
      {
        id: 7,
        nameAr: "شاي",
        nameEn: "Tea",
        price: "6.00",
        quantity: 2,
      },
    ]);

    await snapshotChargesForEnrolledOrder({
      restaurantId: 1,
      checkId: 10,
      orderId: 55,
    });

    expect(mocks.insertCheckCharge).toHaveBeenCalledTimes(1);
    expect(mocks.insertCheckCharge).toHaveBeenCalledWith(
      expect.objectContaining({
        checkId: 10,
        restaurantId: 1,
        netAmount: "12.00",
        unitPrice: "6.00",
        quantity: 2,
        originOrderId: 55,
        originOrderItemId: 7,
        originChannel: "qr",
      }),
      undefined
    );
  });

  it("skips snapshot when origin already has non-zero Charge net", async () => {
    mocks.findCheckById.mockResolvedValue(openCheckRow);
    mocks.listCheckCharges.mockResolvedValue([
      { netAmount: "12.00", originOrderId: 55, originOrderItemId: 7 },
    ]);
    mocks.getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 1,
      status: "pending",
    });
    mocks.getOrderItemsByOrderId.mockResolvedValue([
      { id: 7, nameEn: "Tea", price: "6.00", quantity: 2 },
    ]);

    await snapshotChargesForEnrolledOrder({
      restaurantId: 1,
      checkId: 10,
      orderId: 55,
    });
    expect(mocks.insertCheckCharge).not.toHaveBeenCalled();
  });

  it("compensates origin Charges on OPEN Check without deleting them", async () => {
    mocks.findCheckById.mockResolvedValue(openCheckRow);
    mocks.getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 1,
      status: "cancelled",
    });
    mocks.findBlockingMembershipForOrder.mockResolvedValue({
      checkOutcome: "open",
      membership: { checkId: 10 },
    });
    mocks.listCheckCharges.mockResolvedValue([
      {
        chargeId: "chg_a",
        restaurantId: 1,
        checkId: 10,
        sequence: 1,
        description: "Tea",
        quantity: 2,
        unitPrice: "6.00",
        lineDiscount: "0.00",
        modifierAmount: "0.00",
        netAmount: "12.00",
        taxCategory: null,
        taxAmount: "0.00",
        currencyCode: "SAR",
        originOrderId: 55,
        originOrderItemId: 7,
        originChannel: "qr",
        originReference: "order_item:7",
        createdAt: "2026-08-19 00:00:00",
      },
    ]);
    mocks.nextCheckChargeSequence.mockResolvedValue(2);

    const result = await compensateChargesForCancelledOrder({
      restaurantId: 1,
      orderId: 55,
    });
    expect(result).toEqual({ checkId: 10, compensated: true });
    expect(mocks.insertCheckCharge).toHaveBeenCalledWith(
      expect.objectContaining({
        netAmount: "-12.00",
        originOrderId: 55,
        originOrderItemId: 7,
        originReference: "correction:order_item:7",
      }),
      undefined
    );
  });

  it("refuses compensating Charges on a paid Bill", async () => {
    mocks.findBlockingMembershipForOrder.mockResolvedValue({
      checkOutcome: "paid",
      membership: { checkId: 10 },
    });
    const result = await compensateChargesForCancelledOrder({
      restaurantId: 1,
      orderId: 55,
    });
    expect(result.compensated).toBe(false);
    expect(mocks.insertCheckCharge).not.toHaveBeenCalled();
  });

  it("ensureOpenCheckChargeComposition backfills only when Charge set is empty", async () => {
    mocks.findCheckById.mockResolvedValue(openCheckRow);
    mocks.listCheckCharges.mockResolvedValue([{ netAmount: "1.00" }]);
    await ensureOpenCheckChargeComposition({ restaurantId: 1, checkId: 10 });
    expect(mocks.listActiveOrderIdsForCheck).not.toHaveBeenCalled();
  });

  it("reconcile is a no-op when intended item nets already match", async () => {
    mocks.findCheckById.mockResolvedValue(openCheckRow);
    mocks.getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 1,
      status: "pending",
    });
    mocks.listCheckCharges.mockResolvedValue([
      { netAmount: "12.00", originOrderId: 55, originOrderItemId: 7 },
    ]);
    mocks.getOrderItemsByOrderId.mockResolvedValue([
      { id: 7, nameEn: "Tea", price: "6.00", quantity: 2 },
    ]);
    const first = await reconcileOpenOrderCharges({
      restaurantId: 1,
      checkId: 10,
      orderId: 55,
    });
    const second = await reconcileOpenOrderCharges({
      restaurantId: 1,
      checkId: 10,
      orderId: 55,
    });
    expect(first.applied).toBe(false);
    expect(second.applied).toBe(false);
    expect(mocks.insertCheckCharge).not.toHaveBeenCalled();
  });

  it("adds a Charge for a newly intended item on an OPEN Bill", async () => {
    mocks.findCheckById.mockResolvedValue(openCheckRow);
    mocks.getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 1,
      status: "pending",
      orderingChannel: "qr",
    });
    mocks.listCheckCharges.mockResolvedValue([
      { netAmount: "12.00", originOrderId: 55, originOrderItemId: 7 },
    ]);
    mocks.getOrderItemsByOrderId.mockResolvedValue([
      { id: 7, nameEn: "Tea", price: "6.00", quantity: 2 },
      { id: 8, nameEn: "Water", price: "3.00", quantity: 1 },
    ]);
    mocks.nextCheckChargeSequence.mockResolvedValue(2);
    const result = await reconcileOpenOrderCharges({
      restaurantId: 1,
      checkId: 10,
      orderId: 55,
    });
    expect(result.applied).toBe(true);
    expect(mocks.insertCheckCharge).toHaveBeenCalledTimes(1);
    expect(mocks.insertCheckCharge).toHaveBeenCalledWith(
      expect.objectContaining({
        originOrderItemId: 8,
        netAmount: "3.00",
        originOrderId: 55,
      }),
      undefined
    );
  });

  it("corrects an item price change without mutating the original Charge", async () => {
    mocks.findCheckById.mockResolvedValue(openCheckRow);
    mocks.getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 1,
      status: "pending",
    });
    const original = {
      chargeId: "chg_a",
      netAmount: "50.00",
      originOrderId: 55,
      originOrderItemId: 7,
    };
    mocks.listCheckCharges.mockResolvedValue([original]);
    mocks.getOrderItemsByOrderId.mockResolvedValue([
      { id: 7, nameEn: "Burger", price: "45.00", quantity: 1 },
    ]);
    await reconcileOpenOrderCharges({
      restaurantId: 1,
      checkId: 10,
      orderId: 55,
    });
    expect(original.netAmount).toBe("50.00");
    expect(mocks.insertCheckCharge).toHaveBeenCalledWith(
      expect.objectContaining({ netAmount: "-5.00", originOrderItemId: 7 }),
      undefined
    );
  });

  it("does not add Charges when reconciling a complimentary Bill", async () => {
    mocks.findCheckById.mockResolvedValue({
      ...openCheckRow,
      outcome: "complimentary",
    });
    const result = await reconcileOpenOrderCharges({
      restaurantId: 1,
      checkId: 10,
      orderId: 55,
    });
    expect(result.applied).toBe(false);
    expect(result.blocked).toBe("terminal");
    expect(mocks.insertCheckCharge).not.toHaveBeenCalled();
    expect(mocks.getOrderById).not.toHaveBeenCalled();
  });

  it("does not add Charges when reconciling a voided Bill", async () => {
    mocks.findCheckById.mockResolvedValue({
      ...openCheckRow,
      outcome: "voided",
    });
    const result = await reconcileOpenOrderCharges({
      restaurantId: 1,
      checkId: 10,
      orderId: 55,
    });
    expect(result.applied).toBe(false);
    expect(result.blocked).toBe("terminal");
    expect(mocks.insertCheckCharge).not.toHaveBeenCalled();
  });

  it("does not insert Charges when the OPEN-row lock is lost", async () => {
    mocks.findCheckById.mockResolvedValue(openCheckRow);
    mocks.touchOpenCheck.mockResolvedValue(0);
    mocks.getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 1,
      status: "pending",
    });
    mocks.getOrderItemsByOrderId.mockResolvedValue([
      { id: 7, nameEn: "Tea", price: "6.00", quantity: 2 },
    ]);
    const result = await reconcileOpenOrderCharges({
      restaurantId: 1,
      checkId: 10,
      orderId: 55,
    });
    expect(result.applied).toBe(false);
    expect(result.blocked).toBe("terminal");
    expect(mocks.insertCheckCharge).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant Order correction", async () => {
    mocks.findCheckById.mockResolvedValue(openCheckRow);
    mocks.getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 9,
      status: "pending",
    });
    await expect(
      reconcileOpenOrderCharges({
        restaurantId: 1,
        checkId: 10,
        orderId: 55,
      })
    ).rejects.toThrow(/Cross-tenant/);
    expect(mocks.insertCheckCharge).not.toHaveBeenCalled();
  });

  it("retries once after a duplicate sequence and does not double-apply", async () => {
    mocks.findCheckById.mockResolvedValue(openCheckRow);
    mocks.getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 1,
      status: "pending",
    });
    mocks.getOrderItemsByOrderId.mockResolvedValue([
      { id: 7, nameEn: "Tea", price: "6.00", quantity: 2 },
    ]);
    mocks.listCheckCharges
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { netAmount: "12.00", originOrderId: 55, originOrderItemId: 7 },
      ]);
    mocks.insertCheckCharge.mockRejectedValueOnce({ errno: 1062 });
    const result = await reconcileOpenOrderCharges({
      restaurantId: 1,
      checkId: 10,
      orderId: 55,
    });
    expect(result.applied).toBe(false);
    expect(mocks.insertCheckCharge).toHaveBeenCalledTimes(1);
  });

  it("throws when snapshot Order is missing", async () => {
    mocks.findCheckById.mockResolvedValue(openCheckRow);
    mocks.getOrderById.mockResolvedValue(null);
    await expect(
      snapshotChargesForEnrolledOrder({
        restaurantId: 1,
        checkId: 10,
        orderId: 55,
      })
    ).rejects.toBeInstanceOf(ChargeCompositionError);
  });
});
