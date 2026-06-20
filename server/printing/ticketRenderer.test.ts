import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getOrderById: vi.fn(),
  getOrderItemsByOrderId: vi.fn(),
}));

vi.mock("../db", () => ({
  getOrderById: (...args: unknown[]) => dbMocks.getOrderById(...args),
  getOrderItemsByOrderId: (...args: unknown[]) =>
    dbMocks.getOrderItemsByOrderId(...args),
}));

import { renderKitchenTicket } from "./ticketRenderer";
import {
  KITCHEN_TICKET_TYPE,
  KitchenTicketEmptyItemsError,
  KitchenTicketOrderNotFoundError,
} from "./ticketTypes";

const baseOrder = {
  id: 1001,
  restaurantId: 7,
  tableId: 12,
  tableNumber: 12,
  sessionId: 55,
  customerName: null,
  customerPhone: null,
  status: "pending" as const,
  notes: "No onions",
  totalAmount: "45.00",
  orderNumber: "ORD-01001",
  trackingToken: "tok",
  readyPushSentAt: null,
  readyAt: null,
  whatsappSent: false,
  createdAt: "2026-06-20 12:30:00",
  updatedAt: "2026-06-20 12:30:00",
};

describe("ticketRenderer THERMAL-PRINTING-4A", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getOrderById.mockResolvedValue(baseOrder);
    dbMocks.getOrderItemsByOrderId.mockResolvedValue([
      {
        id: 2,
        orderId: 1001,
        menuItemId: 20,
        nameAr: "برجر",
        nameEn: "Burger",
        price: "15.00",
        quantity: 2,
        notes: null,
        createdAt: "2026-06-20 12:30:00",
      },
      {
        id: 3,
        orderId: 1001,
        menuItemId: 21,
        nameAr: "كولا",
        nameEn: "Cola",
        price: "5.00",
        quantity: 1,
        notes: "Extra ice",
        createdAt: "2026-06-20 12:30:00",
      },
    ]);
  });

  it("renders a normal kitchen ticket with table and session context", async () => {
    const ticket = await renderKitchenTicket({ orderId: 1001 });

    expect(ticket).toEqual({
      ticketType: KITCHEN_TICKET_TYPE.KITCHEN_ORDER,
      restaurantId: 7,
      orderId: 1001,
      orderNumber: "ORD-01001",
      tableNumber: "12",
      sessionId: 55,
      createdAt: new Date("2026-06-20T12:30:00.000Z"),
      notes: "No onions",
      items: [
        { itemName: "برجر", quantity: 2, notes: null },
        { itemName: "كولا", quantity: 1, notes: "Extra ice" },
      ],
    });
  });

  it("prefers Arabic item names with English fallback", async () => {
    dbMocks.getOrderItemsByOrderId.mockResolvedValue([
      {
        id: 1,
        orderId: 1001,
        menuItemId: 30,
        nameAr: "",
        nameEn: "Burger",
        price: "10.00",
        quantity: 1,
        notes: null,
        createdAt: "2026-06-20 12:30:00",
      },
    ]);

    const ticket = await renderKitchenTicket({ orderId: 1001 });
    expect(ticket.items[0]?.itemName).toBe("Burger");
  });

  it("throws when order is missing", async () => {
    dbMocks.getOrderById.mockResolvedValue(null);

    await expect(renderKitchenTicket({ orderId: 1001 })).rejects.toBeInstanceOf(
      KitchenTicketOrderNotFoundError
    );
  });

  it("throws when order has no items", async () => {
    dbMocks.getOrderItemsByOrderId.mockResolvedValue([]);

    await expect(renderKitchenTicket({ orderId: 1001 })).rejects.toBeInstanceOf(
      KitchenTicketEmptyItemsError
    );
  });

  it("renders deterministically for identical input", async () => {
    const first = await renderKitchenTicket({ orderId: 1001 });
    const second = await renderKitchenTicket({ orderId: 1001 });

    expect(first).toEqual(second);
  });

  it("sorts items by stable order item id", async () => {
    dbMocks.getOrderItemsByOrderId.mockResolvedValue([
      {
        id: 9,
        orderId: 1001,
        menuItemId: 21,
        nameAr: "Second",
        nameEn: null,
        price: "5.00",
        quantity: 1,
        notes: null,
        createdAt: "2026-06-20 12:30:00",
      },
      {
        id: 1,
        orderId: 1001,
        menuItemId: 20,
        nameAr: "First",
        nameEn: null,
        price: "5.00",
        quantity: 1,
        notes: null,
        createdAt: "2026-06-20 12:30:00",
      },
    ]);

    const ticket = await renderKitchenTicket({ orderId: 1001 });
    expect(ticket.items.map((item) => item.itemName)).toEqual(["First", "Second"]);
  });

  it("allows null sessionId when order is not session-linked", async () => {
    dbMocks.getOrderById.mockResolvedValue({ ...baseOrder, sessionId: null });

    const ticket = await renderKitchenTicket({ orderId: 1001 });
    expect(ticket.sessionId).toBeNull();
  });
});
