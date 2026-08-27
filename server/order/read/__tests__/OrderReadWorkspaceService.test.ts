import { describe, expect, it, vi } from "vitest";
import { OrderReadWorkspaceService } from "../services/OrderReadWorkspaceService";
import { catchUpOrderReadProjection } from "../catchUpOrderReadProjection";

vi.mock("../catchUpOrderReadProjection", () => ({
  catchUpOrderReadProjection: vi.fn(async () => undefined),
}));

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
  it("catches up the Order Read projection before listActive", async () => {
    const store = {
      listActiveOrders: vi.fn().mockResolvedValue([sampleOrder, { ...sampleOrder, orderId: 2 }]),
      getTimeline: vi.fn(),
      getOrderDetail: vi.fn(),
    };
    const service = new OrderReadWorkspaceService(store as never);
    vi.mocked(catchUpOrderReadProjection).mockClear();

    const result = await service.listActive({ restaurantId: 10, limit: 1 });

    expect(catchUpOrderReadProjection).toHaveBeenCalledTimes(1);
    expect(store.listActiveOrders).toHaveBeenCalledWith({
      restaurantId: 10,
      status: undefined,
      limit: 2,
      cashierPosMembership: "exclude",
    });
    expect(vi.mocked(catchUpOrderReadProjection).mock.invocationCallOrder[0]).toBeLessThan(
      store.listActiveOrders.mock.invocationCallOrder[0]
    );
    expect(result.items).toHaveLength(1);
    expect(result.pageInfo.hasMore).toBe(true);
    expect(result.projectionSchemaVersion).toBeDefined();
  });

  it("forwards paid-visible cashier_pos membership when Orders Workspace requests it", async () => {
    const store = {
      listActiveOrders: vi.fn().mockResolvedValue([sampleOrder]),
      getTimeline: vi.fn(),
      getOrderDetail: vi.fn(),
    };
    const service = new OrderReadWorkspaceService(store as never);

    await service.listActive(
      { restaurantId: 10, status: "preparing", limit: 20 },
      { cashierPosMembership: "paid-visible" }
    );

    expect(store.listActiveOrders).toHaveBeenCalledWith({
      restaurantId: 10,
      status: "preparing",
      limit: 21,
      cashierPosMembership: "paid-visible",
    });
  });

  it("returns cashier_pos preparing rows from the store without a second membership filter", async () => {
    const cashierOrder = {
      ...sampleOrder,
      orderingChannel: "cashier_pos",
      status: "preparing",
    };
    const qrOrder = { ...sampleOrder, orderId: 2, orderingChannel: "qr" };
    const store = {
      listActiveOrders: vi.fn().mockResolvedValue([cashierOrder, qrOrder]),
      getTimeline: vi.fn(),
      getOrderDetail: vi.fn(),
    };
    const service = new OrderReadWorkspaceService(store as never);

    const first = await service.listActive(
      { restaurantId: 10, limit: 100 },
      { cashierPosMembership: "paid-visible" }
    );
    const refresh = await service.listActive(
      { restaurantId: 10, limit: 100 },
      { cashierPosMembership: "paid-visible" }
    );

    expect(first.items.map((item) => item.orderId)).toEqual([1, 2]);
    expect(refresh.items.map((item) => item.orderId)).toEqual([1, 2]);
    expect(first.items[0]).toMatchObject({
      orderingChannel: "cashier_pos",
      status: "preparing",
    });
  });

  it("lists active orders with pagination metadata", async () => {
    const store = {
      listActiveOrders: vi.fn().mockResolvedValue([sampleOrder, { ...sampleOrder, orderId: 2 }]),
      getTimeline: vi.fn(),
      getOrderDetail: vi.fn(),
    };
    const service = new OrderReadWorkspaceService(store as never);

    const result = await service.listActive({ restaurantId: 10, limit: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.pageInfo.hasMore).toBe(true);
  });

  it("catches up before getDetail", async () => {
    const store = {
      listActiveOrders: vi.fn(),
      getTimeline: vi.fn(),
      getOrderDetail: vi.fn().mockResolvedValue({
        order: sampleOrder,
        timeline: [],
      }),
    };
    const service = new OrderReadWorkspaceService(store as never);
    vi.mocked(catchUpOrderReadProjection).mockClear();

    await service.getDetail({ restaurantId: 10, orderId: 1 });

    expect(catchUpOrderReadProjection).toHaveBeenCalledTimes(1);
    expect(vi.mocked(catchUpOrderReadProjection).mock.invocationCallOrder[0]).toBeLessThan(
      store.getOrderDetail.mock.invocationCallOrder[0]
    );
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
