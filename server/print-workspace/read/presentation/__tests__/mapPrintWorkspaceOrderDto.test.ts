import { describe, expect, it } from "vitest";
import { mapPrintWorkspaceOrderDto } from "../mapPrintWorkspaceOrderDto";

describe("mapPrintWorkspaceOrderDto", () => {
  it("exposes resolved display identity from read projection row", () => {
    const dto = mapPrintWorkspaceOrderDto(
      {
        restaurantId: 1,
        orderId: 42,
        orderNumber: "ORD-0242",
        businessDay: "2026-07-10",
        dailyDisplayNumber: 3,
        status: "ready",
        tableId: 1,
        tableNumber: 5,
        sessionId: null,
        customerName: null,
        customerPhone: null,
        notes: null,
        totalAmount: "25.00",
        createdAt: "2026-07-10 12:00:00",
        readyAt: null,
        servedAt: null,
        isActive: true,
        projectionId: "P-02",
        schemaVersion: 1,
        lastEventId: "evt",
        updatedAt: "2026-07-10 12:00:00",
      } as never,
      []
    );

    expect(dto.orderNumber).toBe("ORD-0242");
    expect(dto.displayReference).toBe("003");
    expect(dto.displayOrderNumber).toBe("003");
  });
});
