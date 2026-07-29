/**
 * REALTIME-ORDERS-ADOPTION-1 — unit + architecture tests.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  mapOrderEventToOrdersHintType,
  publishOrdersRealtimeHintAfterProjection,
} from "../realtime/publishOrdersRealtimeHintAfterProjection";
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
    eventId: "evt-1",
    eventType: partial.eventType,
    aggregateType: "Order",
    aggregateId: 42,
    aggregateVersion: 2,
    restaurantId: 7,
    sequenceNumber: 5,
    occurredAt: "2026-07-29T00:00:00.000Z",
    correlationId: "corr-1",
    causationId: null,
    payloadVersion: 1,
    payload: { orderId: 42 },
    ...partial,
  };
}

describe("REALTIME-ORDERS-ADOPTION-1 mapping", () => {
  it("maps domain events to allowed orders hint types", () => {
    expect(mapOrderEventToOrdersHintType("OrderCreated")).toBe("order.created");
    expect(mapOrderEventToOrdersHintType("OrderStatusChanged")).toBe(
      "order.status_changed"
    );
    expect(mapOrderEventToOrdersHintType("OrderReady")).toBe(
      "order.status_changed"
    );
    expect(mapOrderEventToOrdersHintType("OrderCompleted")).toBe("order.served");
    expect(mapOrderEventToOrdersHintType("OrderCancelled")).toBe(
      "order.cancelled"
    );
  });
});

describe("REALTIME-ORDERS-ADOPTION-1 publisher hook", () => {
  it("publishes metadata-only hint on orders channel after projection", async () => {
    if (!isRealtimePlatformEnabled()) return;
    const seen: unknown[] = [];
    const unsub = getRealtimePubSub().subscribe(
      { restaurantId: 7, channel: "orders" },
      (h) => seen.push(h)
    );
    await publishOrdersRealtimeHintAfterProjection(
      envelope({ eventType: "OrderStatusChanged" })
    );
    unsub();
    expect(seen).toHaveLength(1);
    const hint = seen[0] as {
      channel: string;
      type: string;
      aggregateId: string;
      seq: number;
      restaurantId: number;
    };
    expect(hint.channel).toBe("orders");
    expect(hint.type).toBe("order.status_changed");
    expect(hint.aggregateId).toBe("42");
    expect(hint.seq).toBe(5);
    expect(hint.restaurantId).toBe(7);
  });
});

describe("REALTIME-ORDERS-ADOPTION-1 architecture", () => {
  it("wires P-02 consumer to hint publisher", () => {
    const consumers = read(
      "server/order/read/projections/consumers/createOrderReadProjectionConsumers.ts"
    );
    expect(consumers).toContain("publishOrdersRealtimeHintAfterProjection");
    expect(consumers).toContain("ActiveOrdersProjectionConsumer");
  });

  it("Orders Workspace uses platform hook and no EventSource", () => {
    const panel = read(
      "client/src/components/orders-workspace/OrdersWorkspacePanel.tsx"
    );
    expect(panel).toContain("useOrdersWorkspaceRealtime");
    expect(panel).toContain("scheduleOrdersListActiveInvalidation");
    expect(panel).not.toContain("EventSource");
    expect(panel).not.toContain("new EventSource");

    const hook = read(
      "client/src/lib/orders-workspace/useOrdersWorkspaceRealtime.ts"
    );
    expect(hook).toContain("getRealtimePlatform");
    expect(hook).toContain('channels: ["orders"]');
    expect(hook).not.toContain("new EventSource");
  });

  it("does not migrate kitchen or customer", () => {
    const kitchen = read(
      "client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts"
    );
    expect(kitchen).not.toContain("useOrdersWorkspaceRealtime");
    expect(kitchen).not.toContain("getRealtimePlatform");

    const customer = read("client/src/pages/OrderStatusPage.tsx");
    expect(customer).not.toContain("getRealtimePlatform");
  });

  it("marks orders-workspace migrated in capability registry", () => {
    const surface = getRealtimeSurfaceCapability("orders-workspace");
    expect(surface?.migrated).toBe(true);
    expect(surface?.channels).toEqual(["orders"]);
    expect(getRealtimeSurfaceCapability("kitchen-screen")?.migrated).toBe(
      false
    );
  });

  it("program docs exist", () => {
    const base = "docs/engineering/programs/REALTIME-ORDERS-ADOPTION-1";
    for (const name of ["IMPLEMENTATION.md", "FINAL-REPORT.md"]) {
      expect(existsSync(resolve(root, `${base}/${name}`))).toBe(true);
    }
  });
});
