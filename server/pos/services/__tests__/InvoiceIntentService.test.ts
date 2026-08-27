/**
 * CASHIER-INCOMING-HANDOFF-MEMBERSHIP-1
 * Invoice Intent is derived from Order. Membership requires Cashier Handoff.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOrderById: vi.fn(),
  getOrderItemsByOrderId: vi.fn(),
  findProductionCollectionFactByOrderId: vi.fn(),
  hasCashierHandoff: vi.fn(),
  listCashierHandoffsByRestaurant: vi.fn(),
}));

vi.mock("../../../db", () => ({
  getOrderById: (...a: unknown[]) => mocks.getOrderById(...a),
  getOrderItemsByOrderId: (...a: unknown[]) => mocks.getOrderItemsByOrderId(...a),
}));

vi.mock(
  "../../../operational-session/payment/collection-fact/collectionFactRepository",
  () => ({
    findProductionCollectionFactByOrderId: (...a: unknown[]) =>
      mocks.findProductionCollectionFactByOrderId(...a),
  })
);

vi.mock("../../cashier-handoff/cashierHandoffRepository", () => ({
  hasCashierHandoff: (...a: unknown[]) => mocks.hasCashierHandoff(...a),
  listCashierHandoffsByRestaurant: (...a: unknown[]) =>
    mocks.listCashierHandoffsByRestaurant(...a),
}));

import {
  buildInvoiceIntentForOrder,
  invoiceIntentIdForOrder,
  listAwaitingInvoiceIntents,
} from "../InvoiceIntentService";

const TABLE_ORDER = {
  id: 44,
  restaurantId: 1,
  orderingChannel: "table_session",
  sessionId: 9,
  status: "served",
  orderNumber: "T-44",
  totalAmount: "25.00",
};

describe("InvoiceIntentService Cashier Handoff membership", () => {
  beforeEach(() => {
    mocks.getOrderById.mockReset();
    mocks.getOrderItemsByOrderId.mockReset();
    mocks.findProductionCollectionFactByOrderId.mockReset();
    mocks.hasCashierHandoff.mockReset();
    mocks.listCashierHandoffsByRestaurant.mockReset();
    mocks.getOrderItemsByOrderId.mockResolvedValue([
      {
        menuItemId: 7,
        nameAr: "كبسة",
        nameEn: "Kabsa",
        quantity: 2,
        price: "12.50",
      },
    ]);
    mocks.hasCashierHandoff.mockResolvedValue(false);
    mocks.listCashierHandoffsByRestaurant.mockResolvedValue([]);
    mocks.findProductionCollectionFactByOrderId.mockResolvedValue(null);
  });

  it("does not list a never-sent unpaid order", async () => {
    mocks.getOrderById.mockResolvedValue(TABLE_ORDER);
    const awaiting = await listAwaitingInvoiceIntents({ restaurantId: 1 });
    expect(awaiting).toEqual([]);
    expect(
      await buildInvoiceIntentForOrder({ restaurantId: 1, orderId: 44 })
    ).toBeNull();
  });

  it("lists a sent order on the same orderId and drops it after Collection Fact", async () => {
    const orders = [
      TABLE_ORDER,
      { ...TABLE_ORDER, id: 45, orderingChannel: "waiter_tablet", orderNumber: "W-45" },
      { ...TABLE_ORDER, id: 46, orderingChannel: "qr", sessionId: null, orderNumber: "Q-46" },
      { ...TABLE_ORDER, id: 47, orderingChannel: "kiosk", sessionId: null, orderNumber: "K-47" },
      { ...TABLE_ORDER, id: 48, orderingChannel: "cashier_pos", sessionId: null, orderNumber: "C-48" },
      { ...TABLE_ORDER, id: 99, status: "cancelled", orderNumber: "X-99" },
    ];
    mocks.listCashierHandoffsByRestaurant.mockResolvedValue([
      { restaurantId: 1, orderId: 44, sourceChannel: "table_session", sessionId: 9 },
      { restaurantId: 1, orderId: 45, sourceChannel: "waiter_tablet", sessionId: 9 },
      { restaurantId: 1, orderId: 46, sourceChannel: "qr", sessionId: null },
      { restaurantId: 1, orderId: 47, sourceChannel: "kiosk", sessionId: null },
      { restaurantId: 1, orderId: 48, sourceChannel: "cashier_pos", sessionId: null },
      { restaurantId: 1, orderId: 99, sourceChannel: "table_session", sessionId: 9 },
    ]);
    mocks.getOrderById.mockImplementation(async (id: number) => {
      return orders.find((order) => order.id === id) ?? null;
    });
    mocks.findProductionCollectionFactByOrderId.mockImplementation(
      async (input: { orderId: number }) =>
        input.orderId === 45 ? { collectionFactId: "pcf_1" } : null
    );

    const awaiting = await listAwaitingInvoiceIntents({ restaurantId: 1, limit: 50 });
    expect(awaiting.map((intent) => intent.orderId)).toEqual([44, 46, 47]);
    expect(awaiting.every((intent) => intent.status === "awaiting_cashier")).toBe(
      true
    );
    expect(invoiceIntentIdForOrder(1, 44)).toBe("ii:1:44");
  });

  it("excludes historical unpaid orders that were never handed off", async () => {
    mocks.listCashierHandoffsByRestaurant.mockResolvedValue([]);
    mocks.getOrderById.mockResolvedValue({
      ...TABLE_ORDER,
      id: 1,
      createdAt: "2020-01-01 00:00:00",
    });
    expect(await listAwaitingInvoiceIntents({ restaurantId: 1 })).toEqual([]);
  });

  it("does not write Collection Fact or a second order identity", () => {
    expect(invoiceIntentIdForOrder(3, 44)).toBe("ii:3:44");
    expect(invoiceIntentIdForOrder(3, 44)).not.toContain("pcf");
    expect(invoiceIntentIdForOrder(3, 44)).not.toContain("paid");
  });

  it("hydrates the same orderId with existing Order display identity, not a new invoice sequence", async () => {
    mocks.hasCashierHandoff.mockResolvedValue(true);
    mocks.getOrderById.mockResolvedValue({
      ...TABLE_ORDER,
      businessDay: "2026-08-27",
      dailyDisplayNumber: 6,
      identityScope: "TABLE",
      tableNumber: 1,
      fulfilmentAnchorType: "table",
      serviceMode: "table_service",
    });
    const intent = await buildInvoiceIntentForOrder({
      restaurantId: 1,
      orderId: 44,
    });
    expect(intent?.orderId).toBe(44);
    expect(intent?.orderNumber).toBe("T-44");
    expect(intent?.displayReference).toBe("T #006");
    expect(intent?.displayOrderNumber).toBe("006");
    expect(intent?.tableNumber).toBe(1);
    expect(intent?.sessionId).toBe(9);
    expect(intent?.status).toBe("awaiting_cashier");
    expect(intent?.items).toEqual([
      {
        menuItemId: 7,
        nameAr: "كبسة",
        nameEn: "Kabsa",
        quantity: 2,
        unitPrice: "12.50",
        lineTotal: "25.00",
      },
    ]);
    expect(mocks.findProductionCollectionFactByOrderId).toHaveBeenCalled();
  });
});
