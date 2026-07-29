/**
 * REALTIME-CUSTOMER-TRACKING-ADOPTION-1 — unit + architecture + privacy tests.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  mapOrderEventToCustomerHintType,
  publishCustomerRealtimeHintAfterProjection,
} from "../realtime/publishCustomerRealtimeHintAfterProjection";
import type { EventEnvelope } from "../../infrastructure/events/EventEnvelope";
import {
  getRealtimePubSub,
  isRealtimePlatformEnabled,
} from "../../../realtime-platform/composition";
import {
  assertPublicCustomerHintPrivacy,
  hashTrackingToken,
  toPublicCustomerRealtimeHint,
} from "../../../realtime-platform/privacy/publicCustomerHint";
import { createRealtimeHint, getRealtimeSurfaceCapability } from "@shared/realtime-platform";
import {
  filterChannelsForAuthMode,
  mintRealtimeTicket,
  verifyRealtimeTicket,
} from "../../../realtime-platform/tickets/RealtimeTicketService";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

function envelope(
  partial: Partial<EventEnvelope> & Pick<EventEnvelope, "eventType">
): EventEnvelope {
  return {
    id: "1",
    eventId: "evt-c1",
    eventType: partial.eventType,
    aggregateType: "Order",
    aggregateId: 77,
    aggregateVersion: 1,
    restaurantId: 11,
    sequenceNumber: 4,
    occurredAt: "2026-07-28T10:00:00.000Z",
    correlationId: "corr-c",
    causationId: null,
    payloadVersion: 1,
    payload: { orderId: 77, trackingToken: "tok-public-abc" },
    ...partial,
  };
}

describe("REALTIME-CUSTOMER-TRACKING-ADOPTION-1 mapping", () => {
  it("maps domain events to allowed customer hint types", () => {
    expect(mapOrderEventToCustomerHintType("OrderReady")).toBe("order.ready");
    expect(mapOrderEventToCustomerHintType("OrderCompleted")).toBe(
      "order.served"
    );
    expect(mapOrderEventToCustomerHintType("OrderCancelled")).toBe(
      "order.cancelled"
    );
    expect(mapOrderEventToCustomerHintType("OrderStatusChanged")).toBe(
      "customer.status_changed"
    );
    expect(mapOrderEventToCustomerHintType("OrderCreated")).toBe(
      "customer.status_changed"
    );
  });
});

describe("REALTIME-CUSTOMER-TRACKING-ADOPTION-1 privacy", () => {
  it("hashes tracking tokens opaquely", () => {
    const a = hashTrackingToken("tok-public-abc");
    const b = hashTrackingToken("tok-public-abc");
    const c = hashTrackingToken("tok-other");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toHaveLength(32);
    expect(a).not.toContain("tok");
  });

  it("sanitizes public payload to approved fields only", () => {
    const internal = createRealtimeHint({
      type: "order.ready",
      channel: "customer",
      restaurantId: 11,
      aggregateId: "77",
      seq: 4,
      version: "evt-c1",
      correlationId: "corr-c",
      ts: "2026-07-28T10:00:00.000Z",
    });
    const pub = toPublicCustomerRealtimeHint(
      internal,
      hashTrackingToken("tok-public-abc")
    );
    expect(Object.keys(pub).sort()).toEqual(
      ["correlationId", "trackingRef", "ts", "type"].sort()
    );
    assertPublicCustomerHintPrivacy(pub as unknown as Record<string, unknown>);
    expect(pub).not.toHaveProperty("restaurantId");
    expect(pub).not.toHaveProperty("aggregateId");
    expect(pub).not.toHaveProperty("seq");
    expect(pub).not.toHaveProperty("version");
  });

  it("rejects forbidden fields in privacy assert", () => {
    expect(() =>
      assertPublicCustomerHintPrivacy({
        type: "order.ready",
        trackingRef: "abc",
        ts: "t",
        restaurantId: 1,
      })
    ).toThrow(/restaurantId/);
  });
});

describe("REALTIME-CUSTOMER-TRACKING-ADOPTION-1 tickets", () => {
  it("customer tickets only authorize customer channel", () => {
    expect(
      filterChannelsForAuthMode(["orders", "kitchen", "customer"], "customer_tracking")
    ).toEqual(["customer"]);

    const minted = mintRealtimeTicket({
      restaurantId: 11,
      authMode: "customer_tracking",
      sub: `th:${hashTrackingToken("tok")}`,
      channels: ["customer", "orders"],
      orderId: 77,
      trackingRef: hashTrackingToken("tok"),
    });
    expect(minted.claims.channels).toEqual(["customer"]);
    expect(minted.claims.authMode).toBe("customer_tracking");
    expect(minted.claims.trackingRef).toBe(hashTrackingToken("tok"));
    expect(verifyRealtimeTicket(minted.token).ok).toBe(true);
  });

  it("staff tickets cannot include customer channel", () => {
    const minted = mintRealtimeTicket({
      restaurantId: 11,
      authMode: "staff_session",
      sub: "user:1",
      channels: ["orders", "customer"],
    });
    expect(minted.claims.channels).toEqual(["orders"]);
  });
});

describe("REALTIME-CUSTOMER-TRACKING-ADOPTION-1 publisher", () => {
  it("publishes metadata-only hint on customer channel", async () => {
    if (!isRealtimePlatformEnabled()) return;
    const seen: unknown[] = [];
    const unsub = getRealtimePubSub().subscribe(
      { restaurantId: 11, channel: "customer" },
      (h) => seen.push(h)
    );
    await publishCustomerRealtimeHintAfterProjection(
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
    expect(hint.channel).toBe("customer");
    expect(hint.type).toBe("order.ready");
    expect(hint.restaurantId).toBe(11);
    expect(hint.aggregateId).toBe("77");
  });
});

describe("REALTIME-CUSTOMER-TRACKING-ADOPTION-1 architecture", () => {
  it("wires P-11 consumer to customer hint publisher", () => {
    const consumers = read(
      "server/order/read/projections/consumers/createOrderReadProjectionConsumers.ts"
    );
    expect(consumers).toContain("publishCustomerRealtimeHintAfterProjection");
    expect(consumers).toContain("PublicOrderStatusProjectionConsumer");
  });

  it("OrderStatusPage uses platform hook without EventSource", () => {
    const page = read("client/src/pages/OrderStatusPage.tsx");
    expect(page).toContain("useCustomerTrackingRealtime");
    expect(page).not.toContain("EventSource");
    expect(page).toContain("CUSTOMER_ORDER_STATUS_REALTIME_RECOVERY_POLL_MS");

    const hook = read("client/src/hooks/useCustomerTrackingRealtime.ts");
    expect(hook).toContain("getRealtimePlatform");
    expect(hook).toContain('channels: ["customer"]');
    expect(hook).toContain("mintCustomerTicket");
    expect(hook).not.toContain("new EventSource");
    expect(hook).not.toContain("orders");
    expect(hook).not.toContain("kitchen");
  });

  it("exposes public mintCustomerTicket; staff mint remains protected", () => {
    const router = read(
      "server/realtime-platform/realtimePlatformRouter.ts"
    );
    expect(router).toContain("mintCustomerTicket");
    expect(router).toContain("publicProcedure");
    expect(router).toContain("hashTrackingToken");
    expect(router).toContain("getOrderByTrackingToken");
    // Staff mint stays protected
    expect(router).toMatch(/mintTicket:\s*protectedProcedure/);
  });

  it("gateway sanitizes customer SSE payloads", () => {
    const gateway = read(
      "server/realtime-platform/gateway/RealtimeSseGateway.ts"
    );
    expect(gateway).toContain("toPublicCustomerRealtimeHint");
    expect(gateway).toContain("customer_tracking");
  });

  it("marks customer-tracking migrated; dashboard remains false", () => {
    expect(getRealtimeSurfaceCapability("customer-tracking")?.migrated).toBe(
      true
    );
    expect(getRealtimeSurfaceCapability("customer-tracking")?.channels).toEqual(
      ["customer"]
    );
    expect(getRealtimeSurfaceCapability("customer-tracking")?.authMode).toBe(
      "customer_tracking"
    );
    expect(getRealtimeSurfaceCapability("dashboard")?.migrated).toBe(false);
  });

  it("poll recovery constants are 15s live / 3s fallback", () => {
    const runtime = read("client/src/lib/queryRuntime.ts");
    expect(runtime).toContain("CUSTOMER_ORDER_STATUS_POLL_MS = 3_000");
    expect(runtime).toContain(
      "CUSTOMER_ORDER_STATUS_REALTIME_RECOVERY_POLL_MS = 15_000"
    );
  });

  it("program docs exist", () => {
    const base =
      "docs/engineering/programs/REALTIME-CUSTOMER-TRACKING-ADOPTION-1";
    for (const name of ["IMPLEMENTATION.md", "FINAL-REPORT.md"]) {
      expect(existsSync(resolve(root, `${base}/${name}`))).toBe(true);
    }
  });
});
