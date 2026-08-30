/**
 * REALTIME-MULTI-INSTANCE-FANOUT-1 — Phase 2 shared bus tests.
 */
import { describe, expect, it, vi } from "vitest";
import { createRealtimeHint } from "@shared/realtime-platform";
import {
  DatabaseRealtimePubSub,
  createInMemoryRealtimeBusMessageStore,
} from "../pubsub/DatabaseRealtimePubSub";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function hint(over: {
  restaurantId?: number;
  channel?: "orders" | "kitchen" | "expo" | "customer";
  aggregateId?: string;
  seq?: number;
  version?: string;
}) {
  return createRealtimeHint({
    type: "order.status_changed",
    channel: over.channel ?? "kitchen",
    restaurantId: over.restaurantId ?? 1,
    aggregateId: over.aggregateId ?? "55",
    seq: over.seq ?? 1,
    version: over.version ?? `evt-${over.seq ?? 1}`,
  });
}

describe("DatabaseRealtimePubSub multi-instance fan-out", () => {
  it("delivers locally to same-instance subscribers", async () => {
    const store = createInMemoryRealtimeBusMessageStore();
    const a = new DatabaseRealtimePubSub({
      instanceId: "A",
      store,
      sharedEnabled: true,
      pollMs: 60_000,
    });
    const received: string[] = [];
    a.subscribe({ restaurantId: 1, channel: "kitchen" }, (h) => {
      received.push(h.aggregateId ?? "");
    });
    await a.publish(hint({ seq: 1, version: "e1" }));
    expect(received).toEqual(["55"]);
    a.close();
  });

  it("delivers from instance A publish to instance B subscriber", async () => {
    const store = createInMemoryRealtimeBusMessageStore();
    const a = new DatabaseRealtimePubSub({
      instanceId: "A",
      store,
      sharedEnabled: true,
      pollMs: 60_000,
    });
    const b = new DatabaseRealtimePubSub({
      instanceId: "B",
      store,
      sharedEnabled: true,
      pollMs: 60_000,
    });
    const received: string[] = [];
    b.subscribe({ restaurantId: 1, channel: "kitchen" }, (h) => {
      received.push(`${h.version}:${h.seq}`);
    });
    await a.publish(hint({ seq: 7, version: "cross-1" }));
    await b.pollOnceForTests();
    expect(received).toEqual(["cross-1:7"]);
    a.close();
    b.close();
  });

  it("does not double-deliver origin's own shared echo", async () => {
    const store = createInMemoryRealtimeBusMessageStore();
    const a = new DatabaseRealtimePubSub({
      instanceId: "A",
      store,
      sharedEnabled: true,
      pollMs: 60_000,
    });
    const received: number[] = [];
    a.subscribe({ restaurantId: 1, channel: "kitchen" }, () => {
      received.push(1);
    });
    await a.publish(hint({ seq: 2, version: "once" }));
    await a.pollOnceForTests();
    expect(received).toHaveLength(1);
    a.close();
  });

  it("isolates restaurants", async () => {
    const store = createInMemoryRealtimeBusMessageStore();
    const a = new DatabaseRealtimePubSub({
      instanceId: "A",
      store,
      sharedEnabled: true,
      pollMs: 60_000,
    });
    const b = new DatabaseRealtimePubSub({
      instanceId: "B",
      store,
      sharedEnabled: true,
      pollMs: 60_000,
    });
    const received: number[] = [];
    b.subscribe({ restaurantId: 2, channel: "kitchen" }, (h) => {
      received.push(h.restaurantId);
    });
    await a.publish(hint({ restaurantId: 1, seq: 1, version: "r1" }));
    await b.pollOnceForTests();
    expect(received).toEqual([]);
    a.close();
    b.close();
  });

  it("isolates channels", async () => {
    const store = createInMemoryRealtimeBusMessageStore();
    const a = new DatabaseRealtimePubSub({
      instanceId: "A",
      store,
      sharedEnabled: true,
      pollMs: 60_000,
    });
    const b = new DatabaseRealtimePubSub({
      instanceId: "B",
      store,
      sharedEnabled: true,
      pollMs: 60_000,
    });
    const received: string[] = [];
    b.subscribe({ restaurantId: 1, channel: "expo" }, (h) => {
      received.push(h.channel);
    });
    await a.publish(hint({ channel: "kitchen", seq: 1, version: "ch" }));
    await b.pollOnceForTests();
    expect(received).toEqual([]);
    a.close();
    b.close();
  });

  it("store failure degrades without throwing to publisher", async () => {
    const store = {
      insert: vi.fn(async () => {
        throw new Error("bus down");
      }),
      listAfter: vi.fn(async () => []),
      deleteOlderThan: vi.fn(async () => undefined),
    };
    const a = new DatabaseRealtimePubSub({
      instanceId: "A",
      store,
      sharedEnabled: true,
      pollMs: 60_000,
    });
    const received: string[] = [];
    a.subscribe({ restaurantId: 1, channel: "kitchen" }, (h) => {
      received.push(h.version ?? "");
    });
    await expect(a.publish(hint({ version: "local-ok" }))).resolves.toBeUndefined();
    expect(received).toEqual(["local-ok"]);
    expect(a.getStoreStatus()).toBe("degraded");
    a.close();
  });

  it("architecture: no Order/Financial writers in shared bus", () => {
    const root = join(__dirname, "../../..");
    const bus = readFileSync(
      join(root, "server/realtime-platform/pubsub/DatabaseRealtimePubSub.ts"),
      "utf8"
    );
    expect(bus).not.toContain("insertCollectionFact");
    expect(bus).not.toContain("updateOrderStatus");
    expect(bus).not.toContain("applyRefund");
    expect(bus).toMatch(/fail-open/i);
  });
});
