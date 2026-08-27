/**
 * CASHIER-INCOMING-HANDOFF-MEMBERSHIP-1
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOrderById: vi.fn(),
  getOrdersBySessionId: vi.fn(),
  findSessionById: vi.fn(),
  findProductionCollectionFactByOrderId: vi.fn(),
  insertCashierHandoffIgnoreDuplicate: vi.fn(),
}));

vi.mock("../../../db", () => ({
  getOrderById: (...a: unknown[]) => mocks.getOrderById(...a),
  getOrdersBySessionId: (...a: unknown[]) => mocks.getOrdersBySessionId(...a),
}));

vi.mock("../../../diningSession/sessionRepository", () => ({
  findSessionById: (...a: unknown[]) => mocks.findSessionById(...a),
}));

vi.mock(
  "../../../operational-session/payment/collection-fact/collectionFactRepository",
  () => ({
    findProductionCollectionFactByOrderId: (...a: unknown[]) =>
      mocks.findProductionCollectionFactByOrderId(...a),
  })
);

vi.mock("../cashierHandoffRepository", () => ({
  insertCashierHandoffIgnoreDuplicate: (...a: unknown[]) =>
    mocks.insertCashierHandoffIgnoreDuplicate(...a),
}));

import {
  activateCashierHandoffForOrder,
  activateCashierHandoffForSession,
} from "../CashierHandoffService";
import { CashierHandoffError } from "../cashierHandoffErrors";

const TABLE_ORDER = {
  id: 44,
  restaurantId: 1,
  orderingChannel: "table_session",
  sessionId: 9,
  status: "pending",
  orderNumber: "T-44",
};

describe("CashierHandoffService", () => {
  beforeEach(() => {
    mocks.getOrderById.mockReset();
    mocks.getOrdersBySessionId.mockReset();
    mocks.findSessionById.mockReset();
    mocks.findProductionCollectionFactByOrderId.mockReset();
    mocks.insertCashierHandoffIgnoreDuplicate.mockReset();
    mocks.findProductionCollectionFactByOrderId.mockResolvedValue(null);
    mocks.insertCashierHandoffIgnoreDuplicate.mockResolvedValue({ created: true });
  });

  it("Send creates one handoff for the same orderId", async () => {
    mocks.getOrderById.mockResolvedValue(TABLE_ORDER);
    const first = await activateCashierHandoffForOrder({
      restaurantId: 1,
      orderId: 44,
    });
    mocks.insertCashierHandoffIgnoreDuplicate.mockResolvedValue({ created: false });
    const second = await activateCashierHandoffForOrder({
      restaurantId: 1,
      orderId: 44,
    });
    expect(first).toEqual({ restaurantId: 1, orderId: 44 });
    expect(second.orderId).toBe(44);
    expect(mocks.insertCashierHandoffIgnoreDuplicate).toHaveBeenCalledTimes(2);
    expect(mocks.insertCashierHandoffIgnoreDuplicate.mock.calls[0]?.[0]).toEqual({
      restaurantId: 1,
      orderId: 44,
      sourceChannel: "table_session",
      sessionId: 9,
    });
  });

  it("rejects cancelled, unsupported, cashier_pos, and already-paid orders", async () => {
    mocks.getOrderById.mockResolvedValue({ ...TABLE_ORDER, status: "cancelled" });
    await expect(
      activateCashierHandoffForOrder({ restaurantId: 1, orderId: 44 })
    ).rejects.toBeInstanceOf(CashierHandoffError);

    mocks.getOrderById.mockResolvedValue({
      ...TABLE_ORDER,
      orderingChannel: "marketplace",
    });
    await expect(
      activateCashierHandoffForOrder({ restaurantId: 1, orderId: 44 })
    ).rejects.toThrow("Order channel cannot be sent to Cashier");

    mocks.getOrderById.mockResolvedValue({
      ...TABLE_ORDER,
      orderingChannel: "cashier_pos",
    });
    await expect(
      activateCashierHandoffForOrder({ restaurantId: 1, orderId: 44 })
    ).rejects.toThrow("Direct Cashier sales are not Incoming Queue items");

    mocks.getOrderById.mockResolvedValue(TABLE_ORDER);
    mocks.findProductionCollectionFactByOrderId.mockResolvedValue({
      collectionFactId: "pcf_1",
    });
    await expect(
      activateCashierHandoffForOrder({ restaurantId: 1, orderId: 44 })
    ).rejects.toThrow("Order is already paid at Cashier");
    expect(mocks.insertCashierHandoffIgnoreDuplicate).not.toHaveBeenCalled();
  });

  it("session Send activates eligible orders and skips cancelled and paid", async () => {
    mocks.findSessionById.mockResolvedValue({
      id: 9,
      restaurantId: 1,
      status: "open",
    });
    mocks.getOrdersBySessionId.mockResolvedValue([{ id: 44 }, { id: 45 }, { id: 46 }]);
    mocks.getOrderById.mockImplementation(async (id: number) => {
      if (id === 44) return TABLE_ORDER;
      if (id === 45) return { ...TABLE_ORDER, id: 45, status: "cancelled" };
      return { ...TABLE_ORDER, id: 46, orderingChannel: "waiter_tablet" };
    });
    mocks.findProductionCollectionFactByOrderId.mockImplementation(
      async (input: { orderId: number }) =>
        input.orderId === 46 ? { collectionFactId: "pcf_1" } : null
    );

    const result = await activateCashierHandoffForSession({
      restaurantId: 1,
      sessionId: 9,
    });
    expect(result.orderIds).toEqual([44]);
    expect(mocks.insertCashierHandoffIgnoreDuplicate).toHaveBeenCalledTimes(1);
  });

  it("concurrent duplicate Send converges on one orderId", async () => {
    mocks.getOrderById.mockResolvedValue(TABLE_ORDER);
    let inserts = 0;
    mocks.insertCashierHandoffIgnoreDuplicate.mockImplementation(async () => {
      inserts += 1;
      return { created: inserts === 1 };
    });
    const [a, b] = await Promise.all([
      activateCashierHandoffForOrder({ restaurantId: 1, orderId: 44 }),
      activateCashierHandoffForOrder({ restaurantId: 1, orderId: 44 }),
    ]);
    expect(a.orderId).toBe(44);
    expect(b.orderId).toBe(44);
    expect(inserts).toBe(2);
  });
});
