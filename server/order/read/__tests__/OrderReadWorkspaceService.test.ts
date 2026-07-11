import { describe, expect, it, vi } from "vitest";
import { OrderReadWorkspaceService } from "../services/OrderReadWorkspaceService";

const sampleOrder = {
  orderId: 1,
  orderNumber: "1001",
  status: "pending",
  lifecycle: "active",
  tableNumber: 5,
  sessionId: null,
  customerName: "Guest",
  customerPhone: null,
  notes: null,
  totalAmount: "25.00",
  createdAt: "2026-01-01T12:00:00.000Z",
  readyAt: null,
  servedAt: null,
  isActive: true,
  lineItems: [],
};

describe("OrderReadWorkspaceService", () => {
  it("lists active orders with pagination metadata", async () => {
    const store = {
      listActiveOrders: vi.fn().mockResolvedValue([sampleOrder, { ...sampleOrder, orderId: 2 }]),
      getTimeline: vi.fn(),
      getOrderDetail: vi.fn(),
    };
    const service = new OrderReadWorkspaceService(store as never);

    const result = await service.listActive({ restaurantId: 10, limit: 1 });

    expect(store.listActiveOrders).toHaveBeenCalledWith({
      restaurantId: 10,
      status: undefined,
      limit: 2,
    });
    expect(result.items).toHaveLength(1);
    expect(result.pageInfo.hasMore).toBe(true);
    expect(result.projectionSchemaVersion).toBeDefined();
  });

  it("returns timeline from store without new persistence", async () => {
    const events = [
      {
        eventId: "e1",
        fromStatus: null,
        toStatus: "pending",
        occurredAt: "2026-01-01T12:00:00.000Z",
      },
    ];
    const store = {
      listActiveOrders: vi.fn(),
      getTimeline: vi.fn().mockResolvedValue(events),
      getOrderDetail: vi.fn(),
    };
    const service = new OrderReadWorkspaceService(store as never);

    const result = await service.getTimeline({ restaurantId: 10, orderId: 1 });

    expect(result?.events).toEqual(events);
    expect(result?.orderId).toBe(1);
  });
});
