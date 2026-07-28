/**
 * ORDER-LIFECYCLE-LATENCY-INSTRUMENTATION-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createOrderLifecycleTraceId,
  getOrderLifecycleLatencyAggregate,
  recordOrderLifecycleLatencySample,
  resetOrderLifecycleLatencyAggregateForTests,
  ORDER_LIFECYCLE_LATENCY_PROGRAM,
  ORDER_LIFECYCLE_OBSERVER_POLL_MS,
} from "../../../../shared/order-lifecycle-latency";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("ORDER-LIFECYCLE-LATENCY-INSTRUMENTATION-1", () => {
  it("shared contracts and aggregator exist", () => {
    expect(
      existsSync(resolve(root, "shared/order-lifecycle-latency/contracts.ts"))
    ).toBe(true);
    expect(ORDER_LIFECYCLE_OBSERVER_POLL_MS).toBe(3_000);
    expect(createOrderLifecycleTraceId().startsWith("olt_")).toBe(true);

    resetOrderLifecycleLatencyAggregateForTests();
    recordOrderLifecycleLatencySample({
      program: ORDER_LIFECYCLE_LATENCY_PROGRAM,
      traceId: "olt_test",
      result: "ok",
      totalMs: 120,
      phases: { event_relay_ms: 80, invalidate_ms: 20 },
      realtimeEnabled: false,
      pollIntervalMs: 10_000,
      timestamp: new Date().toISOString(),
      transition: "preparing->ready",
      surface: "test",
    });
    const agg = getOrderLifecycleLatencyAggregate();
    expect(agg.count).toBe(1);
    expect(agg.totalMs.avg).toBe(120);
    expect(agg.phaseAvgs.event_relay_ms).toBe(80);
  });

  it("server emits lifecycle summary via ops taxonomy and runOrderCommand phases", () => {
    const taxonomy = read("server/_core/opsTaxonomy.ts");
    expect(taxonomy).toContain("order_lifecycle_latency_summary");
    expect(taxonomy).toContain("order_lifecycle_latency_span");

    const runCmd = read("server/order/application/mapOrderDomainError.ts");
    expect(runCmd).toContain("markOrderLifecycleLatency");
    expect(runCmd).toContain("event_relay_ms");
    expect(runCmd).toContain("runOrderEventRelayBatch");

    const obs = read("server/order/observability/orderLifecycleLatency.ts");
    expect(obs).toContain("withOrderLifecycleLatency");
    expect(obs).not.toContain("trpc.");
    expect(obs).not.toContain("advanceOrderStatus");
  });

  it("status mutation and device action wrap with lifecycle latency context", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("withOrderLifecycleLatency");
    expect(routers).toContain("order.updateStatus");

    const device = read(
      "server/operational-device/services/DeviceOrderExecutionService.ts"
    );
    expect(device).toContain("withOrderLifecycleLatency");
  });

  it("client mutation hooks and transport correlate lifecycleTraceId", () => {
    const actions = read(
      "client/src/lib/operational-workspace/useOrderStatusActions.ts"
    );
    expect(actions).toContain("beginOrderLifecycleClientTrace");
    expect(actions).toContain("lifecycleTraceId");
    expect(actions).toContain("invalidate_ms");

    const device = read(
      "client/src/lib/operational-screen/interaction/useOperationalDeviceOrderActions.ts"
    );
    expect(device).toContain("beginOrderLifecycleClientTrace");
    expect(device).toContain("lifecycleTraceId");

    const links = read("client/src/lib/trpcLinks.ts");
    expect(links).toContain("lifecycleTraceId");
  });

  it("does not introduce realtime WebSocket; poll remains fallback", () => {
    const runtime = read("client/src/lib/queryRuntime.ts");
    expect(runtime).toContain("DASHBOARD_ORDER_LIST_POLL_MS = 10_000");
    expect(runtime).toContain("OPERATIONAL_LIFECYCLE_POLL_MS = 3_000");

    const boot = read("client/src/lib/operational-screen/bootstrapLogic.ts");
    expect(boot).toContain("DATA_POLL_INTERVAL_MS = 3_000");

    const clientLat = read("client/src/lib/order-lifecycle-latency/index.ts");
    expect(clientLat).toContain("realtimeEnabled: false");
    expect(clientLat).not.toContain("WebSocket");
    expect(clientLat).not.toContain("EventSource");
  });

  it("program docs exist", () => {
    const base =
      "docs/engineering/programs/ORDER-LIFECYCLE-LATENCY-INSTRUMENTATION-1";
    for (const name of ["IMPLEMENTATION.md", "FINAL-REPORT.md"]) {
      expect(existsSync(resolve(root, `${base}/${name}`))).toBe(true);
    }
  });
});
