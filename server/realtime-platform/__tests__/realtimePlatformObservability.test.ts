/**
 * REALTIME-PLATFORM-OBSERVABILITY-1 — unit + architecture tests.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LatencyRingBuffer } from "../observability/realtimeLatency";
import {
  evaluateRealtimeHealth,
} from "../observability/realtimeHealth";
import { evaluateRealtimeAlerts } from "../observability/realtimeAlerts";
import {
  sanitizeRealtimeLogMetadata,
  buildRealtimeStructuredLog,
} from "../observability/realtimeStructuredLog";
import { REALTIME_METRICS_CATALOG } from "../observability/realtimeMetricsCatalog";
import {
  getChannelObservabilitySnapshots,
  observeConnectionOpened,
  observeConnectionClosed,
  observeHintPublished,
  observeHintDelivered,
  observeAuthSuccess,
  observeAuthDenied,
  resetRealtimeObservabilityStore,
  getObservabilityLatencyStats,
  getObservabilityConnectionStats,
} from "../observability/realtimeObservabilityStore";
import { buildRealtimeObservabilityDashboard } from "../observability/realtimeDashboard";
import { resetRealtimeMetrics } from "../observability/realtimeMetrics";
import { clearOpaqueRealtimeTicketRegistry } from "../tickets/RealtimeOpaqueTicketRegistry";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

beforeEach(() => {
  resetRealtimeMetrics();
  clearOpaqueRealtimeTicketRegistry();
});

afterEach(() => {
  resetRealtimeMetrics();
  clearOpaqueRealtimeTicketRegistry();
});

describe("REALTIME-PLATFORM-OBSERVABILITY-1 latency", () => {
  it("computes p50/p95/p99/avg/worst", () => {
    const ring = new LatencyRingBuffer();
    for (let i = 1; i <= 100; i++) ring.record(i);
    const p = ring.percentiles();
    expect(p.count).toBe(100);
    expect(p.p50).toBeGreaterThanOrEqual(50);
    expect(p.p95).toBeGreaterThanOrEqual(95);
    expect(p.p99).toBeGreaterThanOrEqual(99);
    expect(p.worst).toBe(100);
    expect(p.avg).toBeCloseTo(50.5, 0);
  });
});

describe("REALTIME-PLATFORM-OBSERVABILITY-1 store", () => {
  it("tracks connections and channel publish→deliver latency", () => {
    observeConnectionOpened({
      connectionId: "c1",
      restaurantId: 9,
      channels: ["orders"],
      activeConnections: 1,
    });
    observeHintPublished({
      channel: "orders",
      correlationId: "corr-1",
      ts: new Date(Date.now() - 25).toISOString(),
    });
    observeHintDelivered({ channel: "orders", correlationId: "corr-1" });
    observeConnectionClosed({
      connectionId: "c1",
      restaurantId: 9,
      channels: ["orders"],
    });

    const channels = getChannelObservabilitySnapshots();
    const orders = channels.find((c) => c.channel === "orders")!;
    expect(orders.publishes).toBe(1);
    expect(orders.deliveries).toBe(1);
    expect(orders.publishToDeliver.count).toBe(1);
    expect(orders.publishToDeliver.p50).toBeGreaterThanOrEqual(20);

    const conn = getObservabilityConnectionStats(0);
    expect(conn.opened).toBe(1);
    expect(conn.closed).toBe(1);
    expect(getObservabilityLatencyStats().publishToDeliver.count).toBe(1);
  });

  it("tracks auth success/denied", () => {
    observeAuthSuccess(2);
    observeAuthDenied("expired");
    const dash = buildRealtimeObservabilityDashboard();
    expect(dash.authorization.success).toBe(1);
    expect(dash.authorization.denied).toBe(1);
  });
});

describe("REALTIME-PLATFORM-OBSERVABILITY-1 health + alerts", () => {
  it("evaluates healthy baseline", () => {
    const health = evaluateRealtimeHealth({
      platformEnabled: true,
      activeConnections: 2,
      authFailureRate: 0,
      channelAuthFailures: 0,
      publishToDeliverP95Ms: 40,
      fallbackActivations: 0,
      registrySize: 3,
      recentAuthDenied: 0,
      publisherPublishes: 10,
      channelSubscriberGaps: [
        { channel: "orders", subscribers: 1, publishes: 10 },
      ],
    });
    expect(health.overall).toBe("healthy");
  });

  it("fires connection surge and high latency alerts", () => {
    const alerts = evaluateRealtimeAlerts({
      activeConnections: 6_000,
      reconnects: 250,
      publishToDeliverP95Ms: 1_500,
      authFailures: 60,
      authDenied: 60,
      channelAuthFailures: 30,
      registryLookups: 100,
      registryLookupFailuresApprox: 40,
      deliveries: 10,
      dropped: 200,
      fallbackActivations: 80,
      platformEnabled: true,
      gatewayUnavailable: false,
    });
    const ids = alerts.map((a) => a.id);
    expect(ids).toContain("connection_surge");
    expect(ids).toContain("reconnect_storm");
    expect(ids).toContain("high_latency");
    expect(ids).toContain("authorization_failures");
    expect(ids).toContain("fallback_spike");
  });

  it("REALTIME-PRODUCTION-ENABLEMENT-1: disabled config is informational, not gateway critical", () => {
    const disabled = evaluateRealtimeAlerts({
      activeConnections: 0,
      reconnects: 0,
      publishToDeliverP95Ms: 0,
      authFailures: 0,
      authDenied: 0,
      channelAuthFailures: 0,
      registryLookups: 0,
      registryLookupFailuresApprox: 0,
      deliveries: 0,
      dropped: 0,
      fallbackActivations: 0,
      platformEnabled: false,
      gatewayUnavailable: true,
    });
    expect(disabled).toEqual([
      expect.objectContaining({
        id: "platform_disabled",
        severity: "info",
        title: "Realtime Platform Disabled",
        detail: "platform_disabled",
      }),
    ]);
    expect(disabled.some((a) => a.id === "gateway_unavailable")).toBe(false);

    const runtimeFail = evaluateRealtimeAlerts({
      activeConnections: 0,
      reconnects: 0,
      publishToDeliverP95Ms: 0,
      authFailures: 0,
      authDenied: 0,
      channelAuthFailures: 0,
      registryLookups: 0,
      registryLookupFailuresApprox: 0,
      deliveries: 0,
      dropped: 0,
      fallbackActivations: 0,
      platformEnabled: true,
      gatewayUnavailable: true,
    });
    expect(runtimeFail).toEqual([
      expect.objectContaining({
        id: "gateway_unavailable",
        severity: "critical",
        title: "Realtime Gateway Unavailable",
        detail: "gateway_shutdown",
      }),
    ]);
  });
});

describe("REALTIME-PLATFORM-OBSERVABILITY-1 privacy", () => {
  it("sanitizes sensitive keys from structured logs", () => {
    const clean = sanitizeRealtimeLogMetadata({
      channel: "orders",
      token: "secret",
      trackingToken: "abc",
      ticketId: "rt_live_abcdefghijklmnop",
      restaurantId: 1,
      lineItems: [{ sku: "x" }],
    });
    expect(clean).not.toHaveProperty("token");
    expect(clean).not.toHaveProperty("trackingToken");
    expect(clean).not.toHaveProperty("lineItems");
    expect(clean.ticketId).toBe("…ijklmnop");
    expect(clean.channel).toBe("orders");

    const log = buildRealtimeStructuredLog({
      timestamp: new Date().toISOString(),
      operation: "deliver",
      result: "ok",
      channel: "orders",
      metadata: { password: "x", seq: 1 },
    });
    expect((log.metadata as Record<string, unknown>).password).toBeUndefined();
    expect((log.metadata as Record<string, unknown>).seq).toBe(1);
  });
});

describe("REALTIME-PLATFORM-OBSERVABILITY-1 dashboard", () => {
  it("builds aggregate with adoption and catalog", () => {
    const dash = buildRealtimeObservabilityDashboard();
    expect(dash.program).toBe("REALTIME-PLATFORM-OBSERVABILITY-1");
    expect(dash.health.overall).toBeTruthy();
    expect(Array.isArray(dash.alerts)).toBe(true);
    expect(dash.adoption.length).toBeGreaterThanOrEqual(4);
    expect(dash.catalogSize).toBe(REALTIME_METRICS_CATALOG.length);
    expect(dash.channels.every((c) =>
      ["orders", "kitchen", "expo", "customer"].includes(c.channel)
    )).toBe(true);
    // Privacy: no restaurant names / order contents
    const json = JSON.stringify(dash);
    expect(json).not.toContain("lineItems");
    expect(json).not.toContain("customerPhone");
  });
});

describe("REALTIME-PLATFORM-OBSERVABILITY-1 architecture", () => {
  it("exposes dashboard/health/alerts/catalog procedures", () => {
    const router = read("server/realtime-platform/realtimePlatformRouter.ts");
    expect(router).toContain("observabilityDashboard");
    expect(router).toContain("observabilityHealth");
    expect(router).toContain("observabilityAlerts");
    expect(router).toContain("observabilityCatalog");
  });

  it("does not alter authorizeRealtimeCredential / registry ACL logic", () => {
    const auth = read(
      "server/realtime-platform/tickets/authorizeRealtimeCredential.ts"
    );
    expect(auth).not.toContain("observeAuth");
    expect(auth).not.toContain("buildRealtimeObservabilityDashboard");
  });

  it("client counters are visibility-only", () => {
    const client = read(
      "client/src/lib/realtime-platform/realtimeClientObservability.ts"
    );
    expect(client).toContain("REALTIME-PLATFORM-OBSERVABILITY-1");
    expect(client).not.toContain("EventSource");
    const platform = read(
      "client/src/lib/realtime-platform/RealtimePlatformClient.ts"
    );
    expect(platform).toContain("noteRealtimeClientFallback");
  });

  it("program docs exist", () => {
    const base =
      "docs/engineering/programs/REALTIME-PLATFORM-OBSERVABILITY-1";
    for (const name of ["IMPLEMENTATION.md", "FINAL-REPORT.md"]) {
      expect(existsSync(resolve(root, `${base}/${name}`))).toBe(true);
    }
  });
});
