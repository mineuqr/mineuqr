/**
 * REALTIME-ARCHITECTURE-REGRESSION-GUARD-1
 *
 * Permanent architecture guards. A plausible future regression must fail these.
 * Protects: SSE + shared TiDB bus, post-projection metadata hints, no business
 * writers, tenant/server ACL, client invalidate/refetch, Kitchen convergence,
 * Connector/BroadcastChannel isolation.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

const FORBIDDEN_BUSINESS_WRITERS = [
  "commitCollectionFact",
  "confirmPayment",
  "allocateCashierInvoiceForOrder",
  "finalizeCheckSettlement",
  "openDrawer",
  "recordDrawerMovement",
  "createRefund",
  "executeRefund",
  "placeOrderService",
  "insert(orders)",
] as const;

describe("REALTIME-ARCHITECTURE-REGRESSION-GUARD-1 — transport / bus (G01–G02, G18–G20)", () => {
  it("G01/G20: Production composition uses createRealtimePubSub (shared bus when DATABASE_URL)", () => {
    const composition = read("server/realtime-platform/composition.ts");
    const factory = read(
      "server/realtime-platform/pubsub/DatabaseRealtimePubSub.ts"
    );
    expect(composition).toContain("createRealtimePubSub()");
    expect(composition).toContain("new RealtimeSseGateway(bus)");
    expect(composition).toContain("new RealtimeHintPublisher(bus)");
    expect(factory).toContain("export function createRealtimePubSub");
    expect(factory).toContain("isRealtimeSharedBusEnabled");
    expect(factory).toContain("return new DatabaseRealtimePubSub()");
    // InMemory only when shared bus explicitly disabled — not Production default
    expect(factory).toMatch(
      /if\s*\(\s*!isRealtimeSharedBusEnabled\(\)\s*\)\s*\{\s*return new InMemoryRealtimePubSub/
    );
    // Default with DATABASE_URL present enables shared bus
    expect(factory).toContain("return Boolean(process.env.DATABASE_URL)");
  });

  it("G02: browser Order Realtime transport is SSE (EventSource), not Connector WS", () => {
    const http = read("server/realtime-platform/http/realtimeHttpRouter.ts");
    const gateway = read(
      "server/realtime-platform/gateway/RealtimeSseGateway.ts"
    );
    const api = read("server/_core/createApiApp.ts");
    const client = read(
      "client/src/lib/realtime-platform/RealtimePlatformClient.ts"
    );
    expect(api).toContain('"/api/realtime"');
    expect(http).toContain('"/sse"');
    expect(http).toContain("getRealtimeSseGateway");
    expect(gateway).toContain("text/event-stream");
    expect(gateway).not.toMatch(/\bWebSocket\b/);
    expect(client).toContain("new EventSource");
    expect(client).not.toMatch(/new\s+WebSocket\b/);
  });

  it("G18: Connector WS remains separate from /api/realtime/sse", () => {
    const index = read("server/_core/index.ts");
    expect(index).toContain("attachConnectorWebSocketServer");
    const connector = read("server/_core/connectorWebSocketServer.ts");
    expect(connector).toMatch(/\/connector\/ws|connector/);
    expect(connector).not.toContain("/api/realtime/sse");
    expect(connector).not.toContain("RealtimeSseGateway");
  });

  it("G19: BroadcastChannel is client multi-tab only — not server fan-out", () => {
    const client = read(
      "client/src/lib/realtime-platform/RealtimePlatformClient.ts"
    );
    expect(client).toContain("RealtimeBroadcastBridge");
    const pubsub = read("server/realtime-platform/pubsub/RealtimePubSub.ts");
    const dbBus = read(
      "server/realtime-platform/pubsub/DatabaseRealtimePubSub.ts"
    );
    expect(pubsub).not.toContain("BroadcastChannel");
    expect(dbBus).not.toContain("BroadcastChannel");
  });

  it("G01 loop: DatabaseRealtimePubSub skips remote redelivery of own originInstanceId", () => {
    const dbBus = read(
      "server/realtime-platform/pubsub/DatabaseRealtimePubSub.ts"
    );
    expect(dbBus).toContain("originInstanceId");
    expect(dbBus).toContain("row.originInstanceId === this.instanceId");
    expect(dbBus).toContain("buildEventId");
  });
});

describe("REALTIME-ARCHITECTURE-REGRESSION-GUARD-1 — event authority (G03–G12, G17)", () => {
  it("G03: hints are metadata-only with assertHintIsMetadataOnly", () => {
    const hints = read("shared/realtime-platform/hints.ts");
    expect(hints).toContain("assertHintIsMetadataOnly");
    expect(hints).toContain("Realtime hint forbids field");
    const publisher = read(
      "server/realtime-platform/publisher/RealtimeHintPublisher.ts"
    );
    expect(publisher).toContain("assertHintIsMetadataOnly");
    for (const bad of ["totalAmount", "paymentMethod", "cardNumber", "password"]) {
      expect(hints).not.toContain(`"${bad}"`);
    }
  });

  it("G04/G25: Order/Kitchen/Expo/Customer hints publish after projection rematerialize", () => {
    const consumers = read(
      "server/order/read/projections/consumers/createOrderReadProjectionConsumers.ts"
    );
    for (const fn of [
      "publishOrdersRealtimeHintAfterProjection",
      "publishKitchenRealtimeHintAfterProjection",
      "publishExpoRealtimeHintAfterProjection",
      "publishCustomerRealtimeHintAfterProjection",
    ]) {
      expect(consumers).toContain(fn);
    }
    // Kitchen path: rematerialize before kitchen hint
    const p02 = consumers.slice(
      consumers.indexOf('name: "ActiveOrdersProjectionConsumer"'),
      consumers.indexOf('name: "OrderDetailsProjectionConsumer"')
    );
    expect(p02.indexOf("ensureSharedOrderRematerialized")).toBeGreaterThan(-1);
    expect(p02.indexOf("publishKitchenRealtimeHintAfterProjection")).toBeGreaterThan(
      p02.indexOf("ensureSharedOrderRematerialized")
    );
  });

  it("G05–G12: Realtime platform + Order hint publishers do not write business domains", () => {
    const paths = [
      "server/realtime-platform/gateway/RealtimeSseGateway.ts",
      "server/realtime-platform/publisher/RealtimeHintPublisher.ts",
      "server/realtime-platform/pubsub/DatabaseRealtimePubSub.ts",
      "server/order/read/realtime/publishOrdersRealtimeHintAfterProjection.ts",
      "server/order/read/realtime/publishKitchenRealtimeHintAfterProjection.ts",
      "server/order/read/realtime/publishExpoRealtimeHintAfterProjection.ts",
      "server/order/read/realtime/publishCustomerRealtimeHintAfterProjection.ts",
      "client/src/lib/realtime-platform/RealtimePlatformClient.ts",
    ];
    for (const path of paths) {
      const body = read(path);
      for (const forbidden of FORBIDDEN_BUSINESS_WRITERS) {
        expect(body).not.toContain(forbidden);
      }
    }
  });

  it("G17: shared bus publish is fail-open (domain not blocked)", () => {
    const dbBus = read(
      "server/realtime-platform/pubsub/DatabaseRealtimePubSub.ts"
    );
    expect(dbBus).toMatch(/Fail-open|fail-open|degraded/i);
    // local deliver still happens even if store insert fails
    expect(dbBus).toContain("deliverLocal");
    expect(dbBus).toContain("lastStoreStatus");
  });

  it("G22: migration terminus keeps 0102 idempotency + 0103 realtime bus", () => {
    const journal = read("drizzle/meta/_journal.json");
    expect(journal).toContain("0102_order_create_idempotency");
    expect(journal).toContain("0103_realtime_bus_messages");
    expect(existsSync(resolve(root, "drizzle/0102_order_create_idempotency.sql"))).toBe(
      true
    );
    expect(existsSync(resolve(root, "drizzle/0103_realtime_bus_messages.sql"))).toBe(
      true
    );
  });
});

describe("REALTIME-ARCHITECTURE-REGRESSION-GUARD-1 — security (G14–G16)", () => {
  it("G14: SSE gateway enforces server-side tenant + channel ACL from ticket claims", () => {
    const gateway = read(
      "server/realtime-platform/gateway/RealtimeSseGateway.ts"
    );
    expect(gateway).toContain("authorizeRealtimeCredential");
    expect(gateway).toContain("verified.claims.restaurantId");
    expect(gateway).toContain("hint.restaurantId !== connection.claims.restaurantId");
    expect(gateway).toContain("Hard tenant isolation");
    // Subscribe uses claims restaurantId — not client-supplied restaurantId
    expect(gateway).toContain(
      "{ restaurantId: verified.claims.restaurantId, channel }"
    );
  });

  it("G15: customer authMode scopes delivery to own aggregateId", () => {
    const gateway = read(
      "server/realtime-platform/gateway/RealtimeSseGateway.ts"
    );
    expect(gateway).toContain('authMode === "customer_tracking"');
    expect(gateway).toContain("connection.claims.orderId");
    expect(gateway).toContain("hint.aggregateId !== String(connection.claims.orderId)");
  });

  it("G16: revocation store is durable (Drizzle) for cross-instance enforcement", () => {
    const store = read(
      "server/realtime-platform/tickets/RealtimeRevocationStore.ts"
    );
    expect(store).toContain("createDrizzleRealtimeRevocationStore");
    expect(store).toContain("realtimeTicketRevocations");
    expect(store).toContain("getRealtimeRevocationStore");
    const gateway = read(
      "server/realtime-platform/gateway/RealtimeSseGateway.ts"
    );
    expect(gateway).toContain("isRealtimeTicketRevoked");
    expect(gateway).toContain("ensureRealtimeTicketRevoked");
  });

  it("G53: device mint binds restaurantId from device session, not client body", () => {
    const runtime = read(
      "server/operational-device/routers/operationalDeviceRuntimeRouter.ts"
    );
    expect(runtime).toContain("mintRealtimeTicket");
    expect(runtime).toContain("restaurantId: session.restaurantId");
    expect(runtime).toContain("Device realtime may only request");
  });

  it("G14 topic injection: SSE channels filtered to ticket-allowed set", () => {
    const gateway = read(
      "server/realtime-platform/gateway/RealtimeSseGateway.ts"
    );
    expect(gateway).toContain("input.channels.filter((c) => allowed.has(c as never))");
    expect(gateway).toContain("No permitted channels");
  });
});

describe("REALTIME-ARCHITECTURE-REGRESSION-GUARD-1 — client / Kitchen (G13, G34–G42)", () => {
  it("G13/G34: client applies hints via handlers — no setQueryData fabricate of business state", () => {
    const client = read(
      "client/src/lib/realtime-platform/RealtimePlatformClient.ts"
    );
    expect(client).toContain("onHint");
    expect(client).toContain("onCatchUp");
    expect(client).not.toContain("setQueryData");
    expect(client).toContain('action === "duplicate"');
    expect(client).toContain('action === "gap"');
    expect(client).toContain("sequence_gap");
  });

  it("G35/G36 Kitchen: invalidate/refetch queue; no EventSource in stream; served excluded by read adapter", () => {
    const stream = read(
      "client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts"
    );
    const hook = read(
      "client/src/lib/operational-screen/kitchen/useKitchenRuntimeRealtime.ts"
    );
    const adapter = read(
      "server/kitchen/read/infrastructure/OrderReadQueryAdapter.ts"
    );
    expect(stream).toContain("scheduleKitchenQueueInvalidation");
    expect(stream).toContain("getKitchenQueue.invalidate");
    expect(stream).toContain("kitchenQueueStructuralSharing");
    expect(stream).not.toContain("new EventSource");
    expect(hook).toContain("onHint");
    expect(hook).toContain("scheduleKitchenQueueInvalidation");
    expect(hook).toContain("onCatchUp");
    expect(adapter).toContain('"pending"');
    expect(adapter).toContain('"preparing"');
    expect(adapter).toContain('"ready"');
    // served is not in kitchen pipeline statuses
    expect(adapter).toMatch(
      /\(\["pending",\s*"preparing",\s*"ready"\]\s*as const\)/
    );
  });

  it("G38: Kitchen uses mergeKitchenQueueCache structural sharing (stale poll protection)", () => {
    const sharing = read("client/src/lib/read-freshness/queryStructuralSharing.ts");
    const merge = read("shared/read-freshness/mergeOrderCaches.ts");
    expect(sharing).toContain("mergeKitchenQueueCache");
    expect(merge).toContain("mergeKitchenQueueCache");
    expect(merge).toMatch(/stale|served|preparing/i);
  });

  it("G57–G59: reconnect uses lastEventId, catch_up, backoff, poll_only", () => {
    const client = read(
      "client/src/lib/realtime-platform/RealtimePlatformClient.ts"
    );
    expect(client).toContain("appendLastEventId");
    expect(client).toContain("lastEventId");
    expect(client).toContain("platform.catch_up");
    expect(client).toContain("poll_only");
    expect(client).toContain("maxReconnectAttempts");
    expect(client).toContain("500 * 2 **");
    const gateway = read(
      "server/realtime-platform/gateway/RealtimeSseGateway.ts"
    );
    expect(gateway).toContain("platform.catch_up");
    expect(gateway).toContain('reason: "resume"');
  });
});

describe("REALTIME-ARCHITECTURE-REGRESSION-GUARD-1 — health boundary", () => {
  it("health evaluates liveness — does not claim browser delivery certification", () => {
    const health = read(
      "server/realtime-platform/observability/realtimeHealth.ts"
    );
    const http = read("server/realtime-platform/http/realtimeHttpRouter.ts");
    expect(http).toMatch(/health|evaluateRealtimeHealth/);
    // Health module must not reference Kitchen UI / Playwright / delivery cert claims
    expect(health).not.toContain("Kitchen");
    expect(health).not.toContain("Playwright");
    expect(health).not.toContain("no-refresh");
  });
});

describe("REALTIME-ARCHITECTURE-REGRESSION-GUARD-1 — program record", () => {
  it("program FINAL-REPORT exists", () => {
    expect(
      existsSync(
        resolve(
          root,
          "docs/engineering/programs/REALTIME-ARCHITECTURE-REGRESSION-GUARD-1/FINAL-REPORT.md"
        )
      )
    ).toBe(true);
  });
});
