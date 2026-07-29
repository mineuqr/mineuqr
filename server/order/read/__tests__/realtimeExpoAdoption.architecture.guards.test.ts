/**
 * REALTIME-EXPO-ADOPTION-1 — unit + architecture tests.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  mapOrderEventToExpoHintType,
  publishExpoRealtimeHintAfterProjection,
} from "../realtime/publishExpoRealtimeHintAfterProjection";
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
    eventId: "evt-e1",
    eventType: partial.eventType,
    aggregateType: "Order",
    aggregateId: 55,
    aggregateVersion: 1,
    restaurantId: 22,
    sequenceNumber: 3,
    occurredAt: "2026-07-29T09:00:00.000Z",
    correlationId: "corr-e",
    causationId: null,
    payloadVersion: 1,
    payload: { orderId: 55 },
    ...partial,
  };
}

describe("REALTIME-EXPO-ADOPTION-1 mapping", () => {
  it("maps domain events to allowed expo hint types", () => {
    expect(mapOrderEventToExpoHintType("OrderReady")).toBe("order.ready");
    expect(mapOrderEventToExpoHintType("OrderCompleted")).toBe("order.served");
    expect(mapOrderEventToExpoHintType("OrderCancelled")).toBe(
      "order.cancelled"
    );
    expect(mapOrderEventToExpoHintType("OrderCreated")).toBe(
      "expo.queue_changed"
    );
    expect(mapOrderEventToExpoHintType("OrderStatusChanged")).toBe(
      "expo.queue_changed"
    );
  });
});

describe("REALTIME-EXPO-ADOPTION-1 publisher", () => {
  it("publishes metadata-only hint on expo channel", async () => {
    if (!isRealtimePlatformEnabled()) return;
    const seen: unknown[] = [];
    const unsub = getRealtimePubSub().subscribe(
      { restaurantId: 22, channel: "expo" },
      (h) => seen.push(h)
    );
    await publishExpoRealtimeHintAfterProjection(
      envelope({ eventType: "OrderReady" })
    );
    unsub();
    expect(seen).toHaveLength(1);
    const hint = seen[0] as {
      channel: string;
      type: string;
      restaurantId: number;
      aggregateId: string;
    };
    expect(hint.channel).toBe("expo");
    expect(hint.type).toBe("order.ready");
    expect(hint.restaurantId).toBe(22);
    expect(hint.aggregateId).toBe("55");
  });
});

describe("REALTIME-EXPO-ADOPTION-1 architecture", () => {
  it("wires P-02 consumer to expo hint publisher", () => {
    const consumers = read(
      "server/order/read/projections/consumers/createOrderReadProjectionConsumers.ts"
    );
    expect(consumers).toContain("publishExpoRealtimeHintAfterProjection");
  });

  it("Expo hook uses platform API without EventSource; gated to expo_display", () => {
    const stream = read(
      "client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts"
    );
    expect(stream).toContain("useExpoRuntimeRealtime");
    expect(stream).not.toContain("EventSource");

    const hook = read(
      "client/src/lib/operational-screen/kitchen/useExpoRuntimeRealtime.ts"
    );
    expect(hook).toContain("getRealtimePlatform");
    expect(hook).toContain('channels: ["expo"]');
    expect(hook).toContain('role === "expo_display"');
    expect(hook).not.toContain("new EventSource");
    expect(hook).not.toContain("kitchen_display");
  });

  it("device mint allows expo_display → expo channel", () => {
    const runtime = read(
      "server/operational-device/routers/operationalDeviceRuntimeRouter.ts"
    );
    expect(runtime).toContain("expo_display");
    expect(runtime).toContain('allowedChannel = "expo"');
  });

  it("marks expo-screen migrated; customer remains false", () => {
    expect(getRealtimeSurfaceCapability("expo-screen")?.migrated).toBe(true);
    expect(getRealtimeSurfaceCapability("expo-screen")?.channels).toEqual([
      "expo",
    ]);
    expect(getRealtimeSurfaceCapability("customer-tracking")?.migrated).toBe(
      false
    );
  });

  it("hint catalog includes expo.queue_changed", () => {
    const hints = read("shared/realtime-platform/hints.ts");
    expect(hints).toContain('"expo.queue_changed"');
  });

  it("program docs exist", () => {
    const base = "docs/engineering/programs/REALTIME-EXPO-ADOPTION-1";
    for (const name of ["IMPLEMENTATION.md", "FINAL-REPORT.md"]) {
      expect(existsSync(resolve(root, `${base}/${name}`))).toBe(true);
    }
  });
});
