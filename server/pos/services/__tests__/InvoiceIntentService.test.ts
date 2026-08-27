/**
 * CASHIER-INCOMING-ORDER-HANDOFF-1 / UNIFIED-POS-FINANCIAL-AUTHORITY-1
 * Invoice Intent is derived from Order. Not Collection Fact. Not a second Order.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOrderById: vi.fn(),
  getOrderItemsByOrderId: vi.fn(),
  getOrdersByRestaurant: vi.fn(),
  findProductionCollectionFactByOrderId: vi.fn(),
}));

vi.mock("../../../db", () => ({
  getOrderById: (...a: unknown[]) => mocks.getOrderById(...a),
  getOrderItemsByOrderId: (...a: unknown[]) => mocks.getOrderItemsByOrderId(...a),
  getOrdersByRestaurant: (...a: unknown[]) => mocks.getOrdersByRestaurant(...a),
}));

vi.mock(
  "../../../operational-session/payment/collection-fact/collectionFactRepository",
  () => ({
    findProductionCollectionFactByOrderId: (...a: unknown[]) =>
      mocks.findProductionCollectionFactByOrderId(...a),
  })
);

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

describe("InvoiceIntentService incoming handoff", () => {
  beforeEach(() => {
    mocks.getOrderById.mockReset();
    mocks.getOrderItemsByOrderId.mockReset();
    mocks.getOrdersByRestaurant.mockReset();
    mocks.findProductionCollectionFactByOrderId.mockReset();
    mocks.getOrderItemsByOrderId.mockResolvedValue([
      {
        menuItemId: 7,
        nameAr: "كبسة",
        nameEn: "Kabsa",
        quantity: 2,
        price: "12.50",
      },
    ]);
  });

  it("keeps Invoice Intent identity equal to the operational orderId", async () => {
    mocks.getOrderById.mockResolvedValue(TABLE_ORDER);
    mocks.findProductionCollectionFactByOrderId.mockResolvedValue(null);
    const first = await buildInvoiceIntentForOrder({
      restaurantId: 1,
      orderId: 44,
    });
    const second = await buildInvoiceIntentForOrder({
      restaurantId: 1,
      orderId: 44,
    });
    expect(invoiceIntentIdForOrder(1, 44)).toBe("ii:1:44");
    expect(first?.orderId).toBe(44);
    expect(second?.invoiceIntentId).toBe(first?.invoiceIntentId);
    expect(first?.status).toBe("awaiting_cashier");
    expect(first?.items).toHaveLength(1);
    expect(first?.items[0]?.quantity).toBe(2);
  });

  it("lists an awaiting Table/Waiter/QR order once and drops it after Collection Fact", async () => {
    mocks.getOrdersByRestaurant.mockResolvedValue([
      TABLE_ORDER,
      { ...TABLE_ORDER, id: 45, orderingChannel: "waiter_tablet", orderNumber: "W-45" },
      { ...TABLE_ORDER, id: 46, orderingChannel: "qr", sessionId: null, orderNumber: "Q-46" },
      { ...TABLE_ORDER, id: 47, orderingChannel: "kiosk", sessionId: null, orderNumber: "K-47" },
    ]);
    mocks.getOrderById.mockImplementation(async (id: number) => {
      const row = (await mocks.getOrdersByRestaurant()) as typeof TABLE_ORDER[];
      return row.find((order) => order.id === id) ?? null;
    });
    mocks.findProductionCollectionFactByOrderId.mockImplementation(
      async (input: { orderId: number }) =>
        input.orderId === 45 ? { collectionFactId: "pcf_1" } : null
    );

    const awaiting = await listAwaitingInvoiceIntents({ restaurantId: 1, limit: 50 });
    const ids = awaiting.map((intent) => intent.orderId);
    expect(ids).toEqual([44, 46, 47]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(awaiting.every((intent) => intent.status === "awaiting_cashier")).toBe(
      true
    );
  });

  it("does not write Collection Fact or a second order identity", () => {
    expect(invoiceIntentIdForOrder(3, 44)).toBe("ii:3:44");
    expect(invoiceIntentIdForOrder(3, 44)).not.toContain("pcf");
    expect(invoiceIntentIdForOrder(3, 44)).not.toContain("paid");
  });
});
