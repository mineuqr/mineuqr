import { beforeEach, describe, expect, it, vi } from "vitest";
import { KitchenReadService } from "../../../kitchen/read/services/KitchenReadService";
import { OrderReadWorkspaceService } from "../services/OrderReadWorkspaceService";

const relay = vi.hoisted(() => ({
  runOrderEventRelayBatch: vi.fn(),
}));

vi.mock("../../eventInfrastructureComposition", () => ({
  runOrderEventRelayBatch: (...args: unknown[]) =>
    relay.runOrderEventRelayBatch(...args),
}));

const emptyStore = {
  listActiveOrders: vi.fn().mockResolvedValue([]),
  getTimeline: vi.fn(),
  getOrderDetail: vi.fn().mockResolvedValue(null),
};

const emptyKitchenPort = {
  listPipelineOrders: vi.fn().mockResolvedValue([]),
  listTimelinesForOrders: vi.fn().mockResolvedValue(new Map()),
};

describe("operational readers share one catch-up flight", () => {
  beforeEach(() => {
    relay.runOrderEventRelayBatch.mockReset();
    emptyStore.listActiveOrders.mockClear();
    emptyStore.getOrderDetail.mockClear();
    emptyKitchenPort.listPipelineOrders.mockClear();
  });

  it("listActive, getDetail, and Kitchen getQueue await the same drain", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    relay.runOrderEventRelayBatch.mockImplementation(async () => {
      await gate;
      return { processed: 0, published: 0, failed: 0, skipped: 0 };
    });

    const orders = new OrderReadWorkspaceService(emptyStore as never);
    const kitchen = new KitchenReadService(emptyKitchenPort as never);

    const stampede = Promise.all([
      orders.listActive({ restaurantId: 1, limit: 10 }),
      orders.listActive({ restaurantId: 1, limit: 10 }),
      orders.getDetail({ restaurantId: 1, orderId: 9 }),
      kitchen.getQueue({ restaurantId: 1, status: "all" }),
      kitchen.getQueue({ restaurantId: 1, status: "all" }),
    ]);

    await vi.waitFor(() => {
      expect(relay.runOrderEventRelayBatch).toHaveBeenCalledTimes(1);
    });

    release();
    await stampede;

    expect(relay.runOrderEventRelayBatch).toHaveBeenCalledTimes(1);
    expect(emptyStore.listActiveOrders).toHaveBeenCalled();
    expect(emptyStore.getOrderDetail).toHaveBeenCalled();
    expect(emptyKitchenPort.listPipelineOrders).toHaveBeenCalled();
  });
});
