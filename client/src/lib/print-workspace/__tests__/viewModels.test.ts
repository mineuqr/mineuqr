import { describe, expect, it } from "vitest";
import { ORDER_LINE_PROJECTION_TYPE_MENU_ITEM } from "@/lib/kitchen/lineProjection";
import { mockCategoryProjection } from "@/lib/operational-screen/__tests__/fixtures/categoryProjectionFixtures";
import {
  connectorReadyForPrint,
  formatHealthLabel,
  formatStatusLabel,
  formatUptime,
  toPrintWorkspaceOrderCard,
} from "../viewModels";

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
            projectionType: ORDER_LINE_PROJECTION_TYPE_MENU_ITEM,
            lineItemId: 1,
            menuItemId: 10,
            nameAr: "برجر",
            nameEn: "Burger",
            quantity: 2,
            price: "15.25",
            category: mockCategoryProjection(),
          },
        ],
      },
      "en"
    );

    expect(card.orderId).toBe(42);
    expect(card.displayReference).toBe("ORD-0042");
    expect(card.itemCount).toBe(2);
    expect(card.isAwaitingPrint).toBe(true);
    expect(card.statusLabel).toBe("Ready");
  });

  it("formats status labels in Arabic", () => {
    expect(formatStatusLabel("preparing", "ar")).toBe("قيد التحضير");
  });

  it("maps connector health labels and readiness", () => {
    expect(formatHealthLabel("connected", "en")).toBe("Connected");
    expect(formatHealthLabel("offline", "ar")).toBe("غير متصل");
    expect(connectorReadyForPrint("connected")).toBe(true);
    expect(connectorReadyForPrint("offline")).toBe(false);
    expect(formatUptime(125 * 60 * 1000, "en")).toBe("2h 5m");
  });
});
