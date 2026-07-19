/**
 * KITCHEN-PRESENTATION-MODIFIERS-ADOPTION-1 — presentation maps Kitchen DTO modifiers.
 */
import { describe, expect, it } from "vitest";
import { mapKitchenTicketPresentation } from "../mapOrderPresentation";
import type { KitchenTicketDto } from "@/lib/kitchen/types";
import { mockCategoryProjection } from "@/lib/operational-screen/__tests__/fixtures/categoryProjectionFixtures";

function ticket(
  lineItems: KitchenTicketDto["lineItems"]
): KitchenTicketDto {
  return {
    orderId: 9,
    orderNumber: "ORD-0009",
    businessDay: "2026-07-19",
    dailyDisplayNumber: 9,
    displayOrderNumber: "009",
    displayReference: "T #009",
    tableNumber: 4,
    sessionId: null,
    serviceMode: "table_service",
    fulfilmentAnchorType: "table",
    fulfilmentLabel: "4",
    customerName: null,
    orderNotes: null,
    status: "pending",
    totalAmount: "15.00",
    createdAt: "2026-07-19 10:00:00",
    readyAt: null,
    statusEnteredAt: "2026-07-19 10:00:00",
    elapsedSeconds: 90,
    columnElapsedSeconds: 90,
    urgencyTier: "normal",
    lineCount: lineItems.length,
    linesSummary: "items",
    lineItems,
    lastEventId: null,
  };
}

describe("KITCHEN-PRESENTATION-MODIFIERS-ADOPTION-1", () => {
  it("forwards projected modifiers onto OrderPresentationLineItem", () => {
    const presentation = mapKitchenTicketPresentation(
      ticket([
        {
          projectionType: "MenuItem",
          lineItemId: 1,
          menuItemId: 10,
          quantity: 1,
          nameAr: "برجر",
          nameEn: "Burger",
          price: "15.00",
          itemNotes: null,
          modifiers: ["No onion", "Extra cheese"],
          category: mockCategoryProjection(),
        },
      ])
    );

    expect(presentation.items.lines).toHaveLength(1);
    expect(presentation.items.lines[0]?.modifiers).toEqual([
      "No onion",
      "Extra cheese",
    ]);
  });

  it("normalizes empty / absent modifiers to empty array (safe .length)", () => {
    const withEmpty = mapKitchenTicketPresentation(
      ticket([
        {
          projectionType: "MenuItem",
          lineItemId: 2,
          menuItemId: 11,
          quantity: 1,
          nameAr: "شاي",
          nameEn: "Tea",
          price: "5.00",
          itemNotes: null,
          modifiers: [],
          category: mockCategoryProjection(),
        },
      ])
    );
    expect(withEmpty.items.lines[0]?.modifiers).toEqual([]);
    expect(withEmpty.items.lines[0]!.modifiers.length).toBe(0);
  });
});
