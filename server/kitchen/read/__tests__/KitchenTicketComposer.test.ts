import { describe, expect, it } from "vitest";
import {
  buildLineCount,
  buildLinesSummary,
  computeUrgencyTier,
  deriveStatusEnteredAt,
  KitchenTicketComposer,
} from "../services/KitchenTicketComposer";
import type { OrderReadPipelineOrderRow } from "../infrastructure/OrderReadQueryAdapter";
import type { OrderCategoryProjection } from "../../../order/read/domain/contracts/categoryProjectionContracts";
import { ORDER_LINE_PROJECTION_TYPE_MENU_ITEM } from "../../../order/read/domain/contracts/lineProjectionContracts";

function sampleCategory(): OrderCategoryProjection {
  return Object.freeze({
    categoryId: 1,
    categoryCode: "cat-1",
    categoryName: "Mains",
    displayOrder: 0,
    parentCategoryId: null,
    version: 1,
    updatedAt: "2026-07-04T10:00:00",
  });
}

const baseOrder: OrderReadPipelineOrderRow = {
  restaurantId: 1,
  orderId: 42,
  orderNumber: "ORD-0042",
  status: "preparing",
  tableId: 3,
  tableNumber: 7,
  sessionId: null,
  customerName: "Guest",
  customerPhone: null,
  notes: "No onions",
  totalAmount: "45.00",
  createdAt: "2026-07-04T10:00:00",
  readyAt: null,
  lastEventId: "evt-1",
  lineItems: [
    {
      projectionType: ORDER_LINE_PROJECTION_TYPE_MENU_ITEM,
      lineItemId: 1,
      menuItemId: 10,
      nameAr: "برجر",
      nameEn: "Burger",
      quantity: 2,
      price: "20.00",
      category: sampleCategory(),
    },
  ],
};

describe("KitchenTicketComposer", () => {
  const composer = new KitchenTicketComposer();
  const now = new Date("2026-07-04T10:19:59");

  it("derives statusEnteredAt from timeline", () => {
    const entered = deriveStatusEnteredAt("preparing", baseOrder.createdAt, [
      { orderId: 42, eventId: "e1", fromStatus: null, toStatus: "pending", occurredAt: "2026-07-04T10:00:00" },
      { orderId: 42, eventId: "e2", fromStatus: "pending", toStatus: "preparing", occurredAt: "2026-07-04T10:10:00" },
    ]);
    expect(entered).toBe("2026-07-04T10:10:00");
  });

  it("falls back to createdAt when timeline missing status entry", () => {
    const entered = deriveStatusEnteredAt("pending", baseOrder.createdAt, []);
    expect(entered).toBe(baseOrder.createdAt);
  });

  it("composes ticket with urgency and summaries", () => {
    const ticket = composer.composeTicket(
      baseOrder,
      [
        { orderId: 42, eventId: "e2", fromStatus: "pending", toStatus: "preparing", occurredAt: "2026-07-04T10:10:00" },
      ],
      now
    );

    expect(ticket.orderId).toBe(42);
    expect(ticket.status).toBe("preparing");
    expect(ticket.lineCount).toBe(2);
    expect(ticket.linesSummary).toBe("2× Burger");
    expect(ticket.orderNotes).toBe("No onions");
    expect(ticket.urgencyTier).toBe("normal");
  });

  it("marks critical urgency after threshold", () => {
    expect(computeUrgencyTier(1199)).toBe("elevated");
    expect(computeUrgencyTier(1200)).toBe("critical");
  });

  it("builds line helpers", () => {
    expect(buildLineCount(baseOrder.lineItems)).toBe(2);
    expect(buildLinesSummary(baseOrder.lineItems)).toContain("Burger");
  });
});
