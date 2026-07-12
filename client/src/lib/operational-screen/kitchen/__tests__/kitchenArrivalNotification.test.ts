import { describe, expect, it, vi } from "vitest";
import type { KitchenRuntimeQueue } from "../kitchenRuntimeReadModel";
import {
  buildKitchenArrivalBaselineToken,
  KitchenArrivalNotificationManager,
  processKitchenOrderArrivals,
  resolveKitchenArrivalProcessMode,
} from "../kitchenArrivalNotification";

function mockQueue(pendingOrderIds: number[]): KitchenRuntimeQueue {
  const pending = pendingOrderIds.map((orderId) => ({
    orderId,
    orderNumber: String(orderId),
    tableNumber: 1,
    sessionId: null,
    customerName: null,
    orderNotes: null,
    status: "pending" as const,
    totalAmount: "10",
    createdAt: "2026-07-06T10:00:00.000Z",
    readyAt: null,
    statusEnteredAt: "2026-07-06T10:00:00.000Z",
    elapsedSeconds: 0,
    columnElapsedSeconds: 0,
    urgencyTier: "normal" as const,
    lineCount: 1,
    linesSummary: "1× Item",
    lineItems: [],
    lastEventId: null,
    orderCategoryIds: [1],
  }));

  return {
    generatedAt: "2026-07-06T10:00:00.000Z",
    tickets: pending,
    columns: { pending, preparing: [], ready: [] },
    meta: {
      totalVisible: pending.length,
      counts: { pending: pending.length, preparing: 0, ready: 0 },
    },
    projection: {
      projectionSchemaVersion: 2,
      categoryProjectionVersion: 1,
      projectionBuildDurationMs: 1,
      projectionIntegrity: "valid",
    },
  };
}

describe("processKitchenOrderArrivals", () => {
  it("baseline seeds pending order ids without reporting arrivals", () => {
    const result = processKitchenOrderArrivals(
      { announcedPendingOrderIds: new Set(), baselineEstablished: false, lastBaselineToken: null },
      { pendingOrderIds: [1, 2], mode: "baseline" }
    );
    expect(result.newArrivals).toEqual([]);
    expect(result.nextState.announcedPendingOrderIds).toEqual(new Set([1, 2]));
  });

  it("observe reports only unseen pending order ids", () => {
    const seeded = processKitchenOrderArrivals(
      { announcedPendingOrderIds: new Set(), baselineEstablished: false, lastBaselineToken: null },
      { pendingOrderIds: [1, 2], mode: "baseline" }
    );

    const result = processKitchenOrderArrivals(seeded.nextState, {
      pendingOrderIds: [1, 2, 3],
      mode: "observe",
    });
    expect(result.newArrivals).toEqual([3]);
    expect(result.nextState.announcedPendingOrderIds).toEqual(new Set([1, 2, 3]));
  });

  it("does not re-notify the same order on polling refresh", () => {
    let state = processKitchenOrderArrivals(
      { announcedPendingOrderIds: new Set(), baselineEstablished: false, lastBaselineToken: null },
      { pendingOrderIds: [1], mode: "baseline" }
    ).nextState;

    for (let poll = 0; poll < 5; poll += 1) {
      const result = processKitchenOrderArrivals(state, {
        pendingOrderIds: [1],
        mode: "observe",
      });
      expect(result.newArrivals).toEqual([]);
      state = result.nextState;
    }
  });

  it("does not notify when order leaves pending (status change)", () => {
    let state = processKitchenOrderArrivals(
      { announcedPendingOrderIds: new Set(), baselineEstablished: false, lastBaselineToken: null },
      { pendingOrderIds: [1], mode: "baseline" }
    ).nextState;

    const moved = processKitchenOrderArrivals(state, {
      pendingOrderIds: [],
      mode: "observe",
    });
    expect(moved.newArrivals).toEqual([]);

    const returned = processKitchenOrderArrivals(moved.nextState, {
      pendingOrderIds: [1],
      mode: "observe",
    });
    expect(returned.newArrivals).toEqual([]);
  });
});

describe("resolveKitchenArrivalProcessMode", () => {
  const connectedReady = {
    baselineEstablished: true,
    lastBaselineToken: "v1:1:0",
    baselineToken: "v1:1:0",
    connectivityState: "connected",
    isShowingStaleData: false,
    isQueueError: false,
    isLoading: false,
    hasQueue: true,
  };

  it("skips during loading, stale data, errors, and reconnect", () => {
    expect(resolveKitchenArrivalProcessMode({ ...connectedReady, isLoading: true })).toBe("skip");
    expect(resolveKitchenArrivalProcessMode({ ...connectedReady, isShowingStaleData: true })).toBe(
      "skip"
    );
    expect(resolveKitchenArrivalProcessMode({ ...connectedReady, isQueueError: true })).toBe("skip");
    expect(
      resolveKitchenArrivalProcessMode({ ...connectedReady, connectivityState: "reconnecting" })
    ).toBe("skip");
  });

  it("baselines on first load and after token change", () => {
    expect(
      resolveKitchenArrivalProcessMode({
        ...connectedReady,
        baselineEstablished: false,
        lastBaselineToken: null,
      })
    ).toBe("baseline");

    expect(
      resolveKitchenArrivalProcessMode({
        ...connectedReady,
        lastBaselineToken: "v1:1:0",
        baselineToken: "v2:1:1",
      })
    ).toBe("baseline");
  });

  it("observes when baseline token is stable", () => {
    expect(resolveKitchenArrivalProcessMode(connectedReady)).toBe("observe");
  });
});

describe("KitchenArrivalNotificationManager", () => {
  it("plays sound once for a genuinely new pending order", () => {
    const playSound = vi.fn(() => true);
    const manager = new KitchenArrivalNotificationManager(playSound);
    const queue = mockQueue([1]);
    const token = buildKitchenArrivalBaselineToken({
      categoryFilterVersion: 1,
      configurationVersion: "v1",
      reconnectCount: 0,
    });

    manager.processFilteredQueue(queue, { mode: "baseline", baselineToken: token });
    expect(playSound).not.toHaveBeenCalled();

    const queueWithNew = mockQueue([1, 2]);
    const event = manager.processFilteredQueue(queueWithNew, {
      mode: "observe",
      baselineToken: token,
    });
    expect(event.newArrivals).toEqual([2]);
    expect(event.played).toBe(true);
    expect(playSound).toHaveBeenCalledTimes(1);
  });

  it("suppresses notifications after reconnect baseline", () => {
    const playSound = vi.fn(() => true);
    const manager = new KitchenArrivalNotificationManager(playSound);
    const tokenV1 = buildKitchenArrivalBaselineToken({
      categoryFilterVersion: 1,
      configurationVersion: "v1",
      reconnectCount: 0,
    });
    manager.processFilteredQueue(mockQueue([1]), { mode: "baseline", baselineToken: tokenV1 });

    const tokenV2 = buildKitchenArrivalBaselineToken({
      categoryFilterVersion: 1,
      configurationVersion: "v1",
      reconnectCount: 1,
    });
    manager.processFilteredQueue(mockQueue([1, 2]), { mode: "baseline", baselineToken: tokenV2 });
    expect(playSound).not.toHaveBeenCalled();
  });

  it("suppresses notifications after configuration reload baseline", () => {
    const playSound = vi.fn(() => true);
    const manager = new KitchenArrivalNotificationManager(playSound);

    manager.processFilteredQueue(mockQueue([1]), {
      mode: "baseline",
      baselineToken: buildKitchenArrivalBaselineToken({
        categoryFilterVersion: 1,
        configurationVersion: "v1",
        reconnectCount: 0,
      }),
    });

    manager.processFilteredQueue(mockQueue([1, 2]), {
      mode: "baseline",
      baselineToken: buildKitchenArrivalBaselineToken({
        categoryFilterVersion: 2,
        configurationVersion: "v2",
        reconnectCount: 0,
      }),
    });

    expect(playSound).not.toHaveBeenCalled();
  });
});
