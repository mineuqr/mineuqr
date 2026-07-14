import { describe, expect, it } from "vitest";
import { nextStatusForAction, toKitchenTicketCard, urgencyClassName } from "../viewModels";
import type { KitchenTicketDto } from "../types";
import { ORDER_LINE_PROJECTION_TYPE_MENU_ITEM } from "@/lib/kitchen/lineProjection";
import { mockCategoryProjection } from "@/lib/operational-screen/__tests__/fixtures/categoryProjectionFixtures";

const sample: KitchenTicketDto = {
  orderId: 1,
  orderNumber: "ORD-1",
  businessDay: "2026-07-04",
  dailyDisplayNumber: 1,
  displayOrderNumber: "001",
  displayReference: "001",
  tableNumber: 4,
  sessionId: null,
  customerName: "Ali",
  orderNotes: "Extra sauce",
  status: "preparing",
  totalAmount: "30.00",
  createdAt: "2026-07-04T10:00:00",
  readyAt: null,
  statusEnteredAt: "2026-07-04T10:05:00",
  elapsedSeconds: 900,
  columnElapsedSeconds: 600,
  urgencyTier: "elevated",
  lineCount: 2,
  linesSummary: "2× Burger",
  lineItems: [],
  lastEventId: "evt",
};

describe("kitchen viewModels", () => {
  it("maps ticket to card actions by status", () => {
    const card = toKitchenTicketCard(sample);
    expect(card.displayReference).toBe("001");
    expect(card.canMarkReady).toBe(true);
    expect(card.canStartPreparing).toBe(false);
    expect(card.elapsedMinutes).toBe(15);
  });

  it("passes line items through to the card presentation model", () => {
    const withLines = toKitchenTicketCard({
      ...sample,
      lineItems: [
        {
          projectionType: ORDER_LINE_PROJECTION_TYPE_MENU_ITEM,
          lineItemId: 1,
          menuItemId: 9,
          nameAr: "تبولة",
          nameEn: "Tabbouleh",
          quantity: 1,
          price: "10.00",
          itemNotes: null,
          category: mockCategoryProjection(),
        },
      ],
    });
    expect(withLines.lineItems).toHaveLength(1);
    expect(withLines.lineItems[0]?.nameAr).toBe("تبولة");
  });

  it("maps workflow actions to order statuses", () => {
    expect(nextStatusForAction("start-preparing")).toBe("preparing");
    expect(nextStatusForAction("mark-ready")).toBe("ready");
    expect(nextStatusForAction("mark-served")).toBe("served");
  });

  it("applies urgency styling tiers", () => {
    expect(urgencyClassName("critical")).toContain("destructive");
    expect(urgencyClassName("normal")).toContain("border-border");
  });
});
