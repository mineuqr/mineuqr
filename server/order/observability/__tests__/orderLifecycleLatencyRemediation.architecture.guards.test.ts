/**
 * ORDER-LIFECYCLE-LATENCY-REMEDIATION-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("ORDER-LIFECYCLE-LATENCY-REMEDIATION-1", () => {
  it("status transitions defer event relay off the HTTP critical path", () => {
    const runCmd = read("server/order/application/mapOrderDomainError.ts");
    expect(runCmd).toContain("awaitRelay");
    expect(runCmd).toContain("scheduleOrderEventRelay");
    expect(runCmd).toContain('event_relay_mode", "deferred"');

    const routers = read("server/routers.ts");
    expect(routers).toContain("awaitRelay: false");

    const device = read(
      "server/operational-device/services/DeviceOrderExecutionService.ts"
    );
    expect(device).toContain("awaitRelay: false");
    expect(runCmd).toContain("options?.awaitRelay !== false");
  });

  it("place-order HTTP paths persist then defer relay (do not await the batch)", () => {
    const routers = read("server/routers.ts");
    const waiterDevice = read(
      "server/operational-device/services/WaiterDeviceOrderingService.ts"
    );
    const createStart = routers.indexOf("  create: publicProcedure");
    const createFn = routers.slice(
      createStart,
      routers.indexOf("  list: verifiedProcedure", createStart)
    );
    const identityFn = routers.slice(
      routers.indexOf("placeWithIdentity:"),
      routers.indexOf("placeAsWaiter:")
    );
    const waiterFn = routers.slice(
      routers.indexOf("placeAsWaiter:"),
      routers.indexOf("  create: publicProcedure")
    );
    expect(createFn).toContain("placeOrderService.execute");
    expect(createFn).toContain("awaitRelay: false");
    expect(identityFn).toContain("identityPlaceOrderService.execute");
    expect(identityFn).toContain("awaitRelay: false");
    expect(waiterFn).toContain("identityPlaceOrderService.execute");
    expect(waiterFn).toContain("awaitRelay: false");
    expect(waiterDevice).toContain("identityPlaceOrderService.execute");
    expect(waiterDevice).toContain("awaitRelay: false");
    expect(createFn).not.toContain("await runOrderEventRelaySafe");
    expect(identityFn).not.toContain("await runOrderEventRelaySafe");
    expect(waiterFn).not.toContain("await runOrderEventRelaySafe");
  });

  it("client uses optimistic listActive patch and non-blocking invalidate", () => {
    const actions = read(
      "client/src/lib/operational-workspace/useOrderStatusActions.ts"
    );
    expect(actions).toContain("onMutate");
    expect(actions).toContain("publishOrderLifecycleUpdate");
    expect(actions).toContain("void Promise.all");
    expect(actions).not.toContain("utils.order.list.invalidate");
    expect(actions).not.toContain("printWorkspace.read.listOrders.invalidate");

    const panel = read(
      "client/src/components/orders-workspace/OrdersWorkspacePanel.tsx"
    );
    expect(panel).toContain("subscribeOrderLifecycleUpdates");
    const statusCallback = panel.match(
      /const orderActions = useOrderStatusActions\([\s\S]*?\n  \);/
    )?.[0];
    expect(statusCallback).toBeTruthy();
    expect(statusCallback).toContain("setPendingActionOrderId(null)");
    expect(statusCallback).not.toContain("listQuery.refetch");
    expect(statusCallback).not.toContain("unpaidQuery.refetch");
    expect(statusCallback).not.toContain("detailQuery.refetch");
  });

  it("Mode A: BroadcastChannel fan-out + 3s operational poll fallback", () => {
    const broadcast = read(
      "client/src/lib/order-lifecycle-latency/orderLifecycleBroadcast.ts"
    );
    expect(broadcast).toContain("BroadcastChannel");
    expect(broadcast).toContain("mineuqr:order-lifecycle");
    expect(broadcast).not.toMatch(/\bnew WebSocket\b/);

    const runtime = read("client/src/lib/queryRuntime.ts");
    expect(runtime).toContain("OPERATIONAL_LIFECYCLE_POLL_MS = 3_000");

    const boot = read("client/src/lib/operational-screen/bootstrapLogic.ts");
    expect(boot).toContain("DATA_POLL_INTERVAL_MS = 3_000");
  });

  it("instrumentation remains wired", () => {
    const actions = read(
      "client/src/lib/operational-workspace/useOrderStatusActions.ts"
    );
    expect(actions).toContain("beginOrderLifecycleClientTrace");
    expect(actions).toContain("endOrderLifecycleClientTrace");

    const taxonomy = read("server/_core/opsTaxonomy.ts");
    expect(taxonomy).toContain("order_lifecycle_latency_summary");
  });

  it("program docs exist", () => {
    const base =
      "docs/engineering/programs/ORDER-LIFECYCLE-LATENCY-REMEDIATION-1";
    for (const name of ["IMPLEMENTATION.md", "FINAL-REPORT.md"]) {
      expect(existsSync(resolve(root, `${base}/${name}`))).toBe(true);
    }
  });
});
