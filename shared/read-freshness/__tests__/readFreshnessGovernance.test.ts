/**
 * ORDER-STATE-PROPAGATION-REMEDIATION-1 — unit tests for Read Freshness Governance.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAllOrderStatusWriteConfirmations,
  clearOrderStatusWriteConfirmation,
  confirmOrderStatusWrite,
  decideOrderStatusCacheReplacement,
  getReadFreshnessCounters,
  mergeActiveOrderListCache,
  mergeKitchenQueueCache,
  mergeStatusBearingItem,
  resetReadFreshnessCounters,
} from "../index";

beforeEach(() => {
  clearAllOrderStatusWriteConfirmations();
  resetReadFreshnessCounters();
});

describe("decideOrderStatusCacheReplacement", () => {
  it("accepts newer status without confirmation", () => {
    const d = decideOrderStatusCacheReplacement({
      orderId: 1,
      existingStatus: "preparing",
      incomingStatus: "ready",
    });
    expect(d.decision).toBe("accept_incoming");
  });

  it("allows regression without confirmation (mutation rollback)", () => {
    const d = decideOrderStatusCacheReplacement({
      orderId: 1,
      existingStatus: "ready",
      incomingStatus: "preparing",
    });
    expect(d.decision).toBe("accept_incoming");
  });

  it("rejects stale read while write confirmation is active", () => {
    confirmOrderStatusWrite(7, "ready");
    const d = decideOrderStatusCacheReplacement({
      orderId: 7,
      existingStatus: "ready",
      incomingStatus: "preparing",
    });
    expect(d.decision).toBe("keep_existing");
    expect(d.reason).toBe("protected_by_confirmed_write");
    expect(getReadFreshnessCounters().rejectedStale).toBe(1);
  });

  it("releases confirmation when read catches up", () => {
    confirmOrderStatusWrite(7, "ready");
    const d = decideOrderStatusCacheReplacement({
      orderId: 7,
      existingStatus: "ready",
      incomingStatus: "ready",
    });
    expect(d.decision).toBe("accept_equal");
    expect(
      decideOrderStatusCacheReplacement({
        orderId: 7,
        existingStatus: "ready",
        incomingStatus: "preparing",
      }).decision
    ).toBe("accept_incoming");
  });
});

describe("mergeActiveOrderListCache", () => {
  it("keeps optimistic READY over late PREPARING projection", () => {
    confirmOrderStatusWrite(42, "ready");
    const existing = {
      items: [{ orderId: 42, status: "ready", readyAt: null }],
      generatedAt: "t0",
    };
    const incoming = {
      items: [{ orderId: 42, status: "preparing", readyAt: null }],
      generatedAt: "t1",
    };
    const merged = mergeActiveOrderListCache(existing, incoming);
    expect(merged.items[0]?.status).toBe("ready");
    expect(merged.generatedAt).toBe("t1");
  });

  it("accepts READY once projection catches up", () => {
    confirmOrderStatusWrite(42, "ready");
    const existing = {
      items: [{ orderId: 42, status: "ready", readyAt: null }],
    };
    const incoming = {
      items: [{ orderId: 42, status: "ready", readyAt: "2026-01-01T00:00:00.000Z" }],
    };
    const merged = mergeActiveOrderListCache(existing, incoming);
    expect(merged.items[0]?.status).toBe("ready");
    expect(merged.items[0]?.readyAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("does not resurrect an optimistically removed served order from a stale list", () => {
    confirmOrderStatusWrite(8, "served");
    const existing = {
      items: [{ orderId: 9, status: "preparing", readyAt: null }],
      generatedAt: "t0",
    };
    const incoming = {
      items: [
        { orderId: 8, status: "preparing", readyAt: null },
        { orderId: 9, status: "preparing", readyAt: null },
      ],
      generatedAt: "t1",
    };
    const merged = mergeActiveOrderListCache(existing, incoming);
    expect(merged.items.map((item) => item.orderId)).toEqual([9]);
  });

  it("keeps an empty optimistic list empty when the only order was served", () => {
    confirmOrderStatusWrite(8, "served");
    const existing = { items: [] as Array<{ orderId: number; status: string }>, generatedAt: "t0" };
    const incoming = {
      items: [{ orderId: 8, status: "ready", readyAt: null }],
      generatedAt: "t1",
    };
    const merged = mergeActiveOrderListCache(existing, incoming);
    expect(merged.items).toEqual([]);
  });

  it("on remount without confirmation, membership follows the authoritative list", () => {
    const incomingCaughtUp = {
      items: [{ orderId: 9, status: "preparing", readyAt: null }],
      generatedAt: "t1",
    };
    const remount = mergeActiveOrderListCache(undefined, incomingCaughtUp);
    expect(remount.items.map((item) => item.orderId)).toEqual([9]);

    const staleServedStillActive = {
      items: [{ orderId: 8, status: "served", readyAt: null }],
      generatedAt: "t1",
    };
    const staleRemount = mergeActiveOrderListCache(undefined, staleServedStillActive);
    expect(staleRemount.items.map((item) => item.orderId)).toEqual([8]);
  });

  it("allows snapshot rollback after clearing confirmation", () => {
    confirmOrderStatusWrite(42, "ready");
    clearOrderStatusWriteConfirmation(42);
    const merged = mergeStatusBearingItem(
      { orderId: 42, status: "ready" },
      { orderId: 42, status: "preparing" }
    );
    expect(merged.status).toBe("preparing");
  });
});

describe("mergeKitchenQueueCache", () => {
  it("moves protected ticket out of stale preparing column", () => {
    confirmOrderStatusWrite(9, "ready");
    const existing = {
      columns: {
        pending: [],
        preparing: [],
        ready: [
          {
            orderId: 9,
            status: "ready",
            readyAt: null,
            lastEventId: "evt-2",
          },
        ],
      },
    };
    const incoming = {
      columns: {
        pending: [],
        preparing: [
          {
            orderId: 9,
            status: "preparing",
            readyAt: null,
            lastEventId: "evt-1",
          },
        ],
        ready: [],
      },
    };
    const merged = mergeKitchenQueueCache(existing, incoming);
    expect(merged.columns.preparing).toHaveLength(0);
    expect(merged.columns.ready).toHaveLength(1);
    expect(merged.columns.ready[0]?.status).toBe("ready");
  });

  it("applies confirmation when cache had no prior ticket", () => {
    confirmOrderStatusWrite(11, "ready");
    const incoming = {
      columns: {
        pending: [],
        preparing: [{ orderId: 11, status: "preparing", readyAt: null }],
        ready: [],
      },
    };
    const merged = mergeKitchenQueueCache(undefined, incoming);
    expect(merged.columns.ready[0]?.status).toBe("ready");
    expect(merged.columns.preparing).toHaveLength(0);
  });
});
