import { describe, expect, it } from "vitest";
import type { SelectTableEvent } from "../../drizzle/schema";
import { TABLE_EVENT_TYPES } from "./sessionTypes";
import { mapTableEventToOwnerTimeline } from "./sessionOwnerTimeline";

describe("sessionOwnerTimeline (UX-1C)", () => {
  it("maps SESSION_OPENED without order fields", () => {
    const row: SelectTableEvent = {
      id: 1,
      restaurantId: 10,
      tableId: 3,
      sessionId: 99,
      orderId: null,
      eventType: TABLE_EVENT_TYPES.SESSION_OPENED,
      metadata: { source: "get_or_create", tableNumber: 5 },
      createdAt: "2026-06-18 21:42:00",
    };

    expect(mapTableEventToOwnerTimeline(row)).toEqual({
      id: 1,
      eventType: TABLE_EVENT_TYPES.SESSION_OPENED,
      createdAt: "2026-06-18 21:42:00",
      orderId: null,
      orderNumber: null,
      displayReference: null,
      totalAmount: null,
    });
  });

  it("maps SESSION_PAID preferring checkGrandTotal over totalAmount", () => {
    const row: SelectTableEvent = {
      id: 3,
      restaurantId: 10,
      tableId: 3,
      sessionId: 99,
      orderId: null,
      eventType: TABLE_EVENT_TYPES.SESSION_PAID,
      metadata: {
        totalAmount: "1.00",
        checkGrandTotal: "95.00",
      },
      createdAt: "2026-06-18 21:44:00",
    };

    expect(mapTableEventToOwnerTimeline(row).totalAmount).toBe("95.00");
  });

  it("maps ORDER_CREATED with metadata orderNumber and totalAmount", () => {
    const row: SelectTableEvent = {
      id: 2,
      restaurantId: 10,
      tableId: 3,
      sessionId: 99,
      orderId: 500,
      eventType: TABLE_EVENT_TYPES.ORDER_CREATED,
      metadata: {
        orderNumber: "ORD-0142",
        totalAmount: "95.00",
        itemCount: 2,
      },
      createdAt: "2026-06-18 21:43:00",
    };

    expect(mapTableEventToOwnerTimeline(row)).toEqual({
      id: 2,
      eventType: TABLE_EVENT_TYPES.ORDER_CREATED,
      createdAt: "2026-06-18 21:43:00",
      orderId: 500,
      orderNumber: "ORD-0142",
      displayReference: null,
      totalAmount: "95.00",
    });
  });
});
