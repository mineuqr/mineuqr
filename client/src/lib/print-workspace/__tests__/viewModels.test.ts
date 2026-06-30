import { describe, expect, it } from "vitest";
import { formatStatusLabel, toPrintWorkspaceOrderCard } from "../viewModels";

describe("print workspace view models", () => {
  it("maps order row to card model", () => {
    const card = toPrintWorkspaceOrderCard(
      {
        orderId: 42,
        orderNumber: "ORD-0042",
        status: "ready",
        tableNumber: 5,
        sessionId: null,
        customerName: "Ali",
        customerPhone: null,
        notes: "No onions",
        totalAmount: "30.50",
        createdAt: "2026-06-29T10:00:00",
        readyAt: null,
        servedAt: null,
        isActive: true,
        lineItems: [
          {
            lineItemId: 1,
            menuItemId: 10,
            nameAr: "برجر",
            nameEn: "Burger",
            quantity: 2,
            price: "15.25",
          },
        ],
      },
      "en"
    );

    expect(card.orderId).toBe(42);
    expect(card.itemCount).toBe(2);
    expect(card.isAwaitingPrint).toBe(true);
    expect(card.statusLabel).toBe("Ready");
  });

  it("formats status labels in Arabic", () => {
    expect(formatStatusLabel("preparing", "ar")).toBe("قيد التحضير");
  });
});
