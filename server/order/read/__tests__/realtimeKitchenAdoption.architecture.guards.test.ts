/**
 * REALTIME-KITCHEN-ADOPTION-1 — unit + architecture tests.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  mapOrderEventToKitchenHintType,
  publishKitchenRealtimeHintAfterProjection,
} from "../realtime/publishKitchenRealtimeHintAfterProjection";
import type { EventEnvelope } from "../../infrastructure/events/EventEnvelope";
import {
  getRealtimePubSub,
  isRealtimePlatformEnabled,
} from "../../../realtime-platform/composition";
import { getRealtimeSurfaceCapability } from "@shared/realtime-platform";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

function envelope(
  partial: Partial<EventEnvelope> & Pick<EventEnvelope, "eventType">
): EventEnvelope {
  return {
    id: "1",
    eventId: "evt-k1",
    eventType: partial.eventType,
    aggregateType: "Order",
    aggregateId: 99,
    aggregateVersion: 1,
    restaurantId: 11,
    sequenceNumber: 8,
    occurredAt: "2026-07-29T08:00:00.000Z",
    correlationId: "corr-k",
    causationId: null,
    payloadVersion: 1,
    payload: { orderId: 99 },
    ...partial,
  };
}

describe("REALTIME-KITCHEN-ADOPTION-1 mapping", () => {
  it("maps domain events to allowed kitchen hint types", () => {
    expect(mapOrderEventToKitchenHintType("OrderCreated")).toBe("order.created");
    expect(mapOrderEventToKitchenHintType("OrderStatusChanged")).toBe(
      "order.status_changed"
    );
    expect(mapOrderEventToKitchenHintType("OrderCancelled")).toBe(
      "order.cancelled"
    );
    expect(mapOrderEventToKitchenHintType("OrderCompleted")).toBe(
      "kitchen.queue_changed"
    );
  });
});

describe("REALTIME-KITCHEN-ADOPTION-1 publisher", () => {
  it("publishes metadata-only hint on kitchen channel", async () => {
    if (!isRealtimePlatformEnabled()) return;
    const seen: unknown[] = [];
    const unsub = getRealtimePubSub().subscribe(
      { restaurantId: 11, channel: "kitchen" },
      (h) => seen.push(h)
    );
    await publishKitchenRealtimeHintAfterProjection(
      envelope({ eventType: "OrderCreated" })
    );
    unsub();
    expect(seen).toHaveLength(1);
    const hint = seen[0] as {
      channel: string;
      type: string;
      restaurantId: number;
      aggregateId: string;
    };
    expect(hint.channel).toBe("kitchen");
    expect(hint.type).toBe("order.created");
    expect(hint.restaurantId).toBe(11);
    expect(hint.aggregateId).toBe("99");
  });
});

describe("REALTIME-KITCHEN-ADOPTION-1 architecture", () => {
  it("wires P-02 consumer to kitchen hint publisher", () => {
    const consumers = read(
      "server/order/read/projections/consumers/createOrderReadProjectionConsumers.ts"
    );
    expect(consumers).toContain("publishKitchenRealtimeHintAfterProjection");
  });

  it("Kitchen stream uses platform hook without EventSource; gated to kitchen_display", () => {
    const stream = read(
      "client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts"
    );
    expect(stream).toContain("useKitchenRuntimeRealtime");
    expect(stream).toContain("scheduleKitchenQueueInvalidation");
    expect(stream).toContain("useKitchenArrivalNotifications");
    expect(stream).not.toContain("EventSource");
    expect(stream).not.toContain("new EventSource");

    const hook = read(
      "client/src/lib/operational-screen/kitchen/useKitchenRuntimeRealtime.ts"
    );
    expect(hook).toContain("getRealtimePlatform");
    expect(hook).toContain('channels: ["kitchen"]');
    expect(hook).toContain('role === "kitchen_display"');
    expect(hook).not.toContain("new EventSource");
  });

  it("device runtime exposes kitchen-only mintRealtimeTicket", () => {
    const runtime = read(
      "server/operational-device/routers/operationalDeviceRuntimeRouter.ts"
    );
    expect(runtime).toContain("mintRealtimeTicket");
    expect(runtime).toContain('kitchen_display');
    expect(runtime).toContain('c !== "kitchen"');
  });

  it("does not migrate expo capability or customer", () => {
    expect(getRealtimeSurfaceCapability("expo-screen")?.migrated).toBe(false);
    expect(getRealtimeSurfaceCapability("kitchen-screen")?.migrated).toBe(true);
    const customer = read("client/src/pages/OrderStatusPage.tsx");
    expect(customer).not.toContain("getRealtimePlatform");
  });

  it("preserves kitchen notification manager ownership", () => {
    const stream = read(
      "client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts"
    );
    expect(stream).toContain("useKitchenArrivalNotifications");
    const notify = read(
      "client/src/lib/operational-screen/kitchen/useKitchenArrivalNotifications.ts"
    );
    expect(notify).not.toContain("getRealtimePlatform");
    expect(notify).not.toContain("EventSource");
  });

  it("program docs exist", () => {
    const base = "docs/engineering/programs/REALTIME-KITCHEN-ADOPTION-1";
    for (const name of ["IMPLEMENTATION.md", "FINAL-REPORT.md"]) {
      expect(existsSync(resolve(root, `${base}/${name}`))).toBe(true);
    }
  });
});
