import { describe, expect, it, vi } from "vitest";
import type { KitchenRuntimeQueue } from "../kitchenRuntimeReadModel";
import {
  buildKitchenArrivalBaselineToken,
  collectFilteredVisibleOrderIds,
  KitchenArrivalNotificationManager,
  processKitchenOrderArrivals,
  resolveKitchenArrivalProcessMode,
} from "../kitchenArrivalNotification";

function mockTicket(
  orderId: number,
  status: "pending" | "preparing" | "ready"
) {
  return {
    orderId,
    orderNumber: String(orderId),
    tableNumber: 1,
    sessionId: null,
    customerName: null,
    orderNotes: null,
    status,
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
  };
}

function mockQueue(input: {
  pending?: number[];
  preparing?: number[];
  ready?: number[];
}): KitchenRuntimeQueue {
  const pending = (input.pending ?? []).map((id) => mockTicket(id, "pending"));
  const preparing = (input.preparing ?? []).map((id) => mockTicket(id, "preparing"));
  const ready = (input.ready ?? []).map((id) => mockTicket(id, "ready"));
  const tickets = [...pending, ...preparing, ...ready];

  return {
    generatedAt: "2026-07-06T10:00:00.000Z",
    tickets,
    columns: { pending, preparing, ready },
    meta: {
      totalVisible: tickets.length,
      counts: {
        pending: pending.length,
        preparing: preparing.length,
        ready: ready.length,
      },
    },
    projection: {
      projectionSchemaVersion: 2,
      categoryProjectionVersion: 1,
      projectionBuildDurationMs: 1,
      projectionIntegrity: "valid",
    },
  };
}

describe("collectFilteredVisibleOrderIds", () => {
  it("collects order ids from all filtered runtime columns", () => {
    const ids = collectFilteredVisibleOrderIds(
      mockQueue({ pending: [1], preparing: [2], ready: [3] })
    );
    expect(ids.sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });
});

describe("processKitchenOrderArrivals", () => {
  it("baseline seeds visible order ids without reporting arrivals", () => {
    const result = processKitchenOrderArrivals(
      { announcedVisibleOrderIds: new Set(), baselineEstablished: false, lastBaselineToken: null },
      { visibleOrderIds: [1, 2], mode: "baseline" }
    );
    expect(result.newArrivals).toEqual([]);
    expect(result.nextState.announcedVisibleOrderIds).toEqual(new Set([1, 2]));
  });

  it("observe reports only unseen visible order ids", () => {
    const seeded = processKitchenOrderArrivals(
      { announcedVisibleOrderIds: new Set(), baselineEstablished: false, lastBaselineToken: null },
      { visibleOrderIds: [1, 2], mode: "baseline" }
    );

    const result = processKitchenOrderArrivals(seeded.nextState, {
      visibleOrderIds: [1, 2, 3],
      mode: "observe",
    });
    expect(result.newArrivals).toEqual([3]);
    expect(result.nextState.announcedVisibleOrderIds).toEqual(new Set([1, 2, 3]));
  });

  it("does not re-notify the same order on polling refresh", () => {
    let state = processKitchenOrderArrivals(
      { announcedVisibleOrderIds: new Set(), baselineEstablished: false, lastBaselineToken: null },
      { visibleOrderIds: [1], mode: "baseline" }
    ).nextState;

    for (let poll = 0; poll < 5; poll += 1) {
      const result = processKitchenOrderArrivals(state, {
        visibleOrderIds: [1],
        mode: "observe",
      });
      expect(result.newArrivals).toEqual([]);
      state = result.nextState;
    }
  });

  it("does not re-notify when order moves between pipeline columns", () => {
    let state = processKitchenOrderArrivals(
      { announcedVisibleOrderIds: new Set(), baselineEstablished: false, lastBaselineToken: null },
      { visibleOrderIds: [1], mode: "baseline" }
    ).nextState;

    const preparing = processKitchenOrderArrivals(state, {
      visibleOrderIds: [1],
      mode: "observe",
    });
    expect(preparing.newArrivals).toEqual([]);
    state = preparing.nextState;

    const ready = processKitchenOrderArrivals(state, {
      visibleOrderIds: [1],
      mode: "observe",
    });
    expect(ready.newArrivals).toEqual([]);
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
  const token = buildKitchenArrivalBaselineToken({
    categoryFilterVersion: 1,
    configurationVersion: "v1",
    reconnectCount: 0,
  });

  it("plays sound once for a genuinely new pending order", () => {
    const playSound = vi.fn(() => true);
    const manager = new KitchenArrivalNotificationManager(playSound);

    manager.processFilteredQueue(mockQueue({ pending: [1] }), { mode: "baseline", baselineToken: token });
    expect(playSound).not.toHaveBeenCalled();

    const event = manager.processFilteredQueue(mockQueue({ pending: [1, 2] }), {
      mode: "observe",
      baselineToken: token,
    });
    expect(event.newArrivals).toEqual([2]);
    expect(event.played).toBe(true);
    expect(playSound).toHaveBeenCalledTimes(1);
  });

  it("plays sound when order first appears in preparing column", () => {
    const playSound = vi.fn(() => true);
    const manager = new KitchenArrivalNotificationManager(playSound);

    manager.processFilteredQueue(mockQueue({}), { mode: "baseline", baselineToken: token });

    const event = manager.processFilteredQueue(mockQueue({ preparing: [42] }), {
      mode: "observe",
      baselineToken: token,
    });
    expect(event.newArrivals).toEqual([42]);
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
    manager.processFilteredQueue(mockQueue({ pending: [1] }), { mode: "baseline", baselineToken: tokenV1 });

    const tokenV2 = buildKitchenArrivalBaselineToken({
      categoryFilterVersion: 1,
      configurationVersion: "v1",
      reconnectCount: 1,
    });
    manager.processFilteredQueue(mockQueue({ pending: [1], preparing: [2] }), {
      mode: "baseline",
      baselineToken: tokenV2,
    });
    expect(playSound).not.toHaveBeenCalled();
  });

  it("suppresses notifications after configuration reload baseline", () => {
    const playSound = vi.fn(() => true);
    const manager = new KitchenArrivalNotificationManager(playSound);

    manager.processFilteredQueue(mockQueue({ pending: [1] }), {
      mode: "baseline",
      baselineToken: buildKitchenArrivalBaselineToken({
        categoryFilterVersion: 1,
        configurationVersion: "v1",
        reconnectCount: 0,
      }),
    });

    manager.processFilteredQueue(mockQueue({ pending: [1], preparing: [2] }), {
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
