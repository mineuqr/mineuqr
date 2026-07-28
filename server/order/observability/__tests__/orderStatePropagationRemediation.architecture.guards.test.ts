/**
 * ORDER-STATE-PROPAGATION-REMEDIATION-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("ORDER-STATE-PROPAGATION-REMEDIATION-1", () => {
  it("keeps deferred relay enabled (no awaitRelay restore)", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("awaitRelay: false");
    const device = read(
      "server/operational-device/services/DeviceOrderExecutionService.ts"
    );
    expect(device).toContain("awaitRelay: false");
    const runCmd = read("server/order/application/mapOrderDomainError.ts");
    expect(runCmd).toContain("scheduleOrderEventRelay");
  });

  it("wires Read Freshness Governance into listActive and kitchen queue", () => {
    const runtime = read("client/src/lib/queryRuntime.ts");
    expect(runtime).toContain("activeOrderListStructuralSharing");
    expect(runtime).toContain("CUSTOMER_ORDER_STATUS_POLL_MS = 3_000");

    const kitchen = read(
      "client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts"
    );
    expect(kitchen).toContain("kitchenQueueStructuralSharing");

    const actions = read(
      "client/src/lib/operational-workspace/useOrderStatusActions.ts"
    );
    expect(actions).toContain("confirmOrderStatusWrite");
    expect(actions).toContain("clearOrderStatusWriteConfirmation");
  });

  it("BroadcastChannel ignores same-tab publisher", () => {
    const broadcast = read(
      "client/src/lib/order-lifecycle-latency/orderLifecycleBroadcast.ts"
    );
    expect(broadcast).toContain("publisherId");
    expect(broadcast).toContain("ignoreSelf");
  });

  it("shared governance module exports merge + confirmation APIs", () => {
    const index = read("shared/read-freshness/index.ts");
    expect(index).toContain("confirmedWriteRegistry");
    expect(index).toContain("mergeOrderCaches");
    expect(index).toContain("governance");
  });

  it("does not restore synchronous projection or domain changes in status path", () => {
    const actions = read(
      "client/src/lib/operational-workspace/useOrderStatusActions.ts"
    );
    expect(actions).toContain("void Promise.all");
    expect(actions).not.toContain("awaitRelay: true");
  });

  it("program docs exist", () => {
    const base =
      "docs/engineering/programs/ORDER-STATE-PROPAGATION-REMEDIATION-1";
    for (const name of ["IMPLEMENTATION.md", "FINAL-REPORT.md"]) {
      expect(existsSync(resolve(root, `${base}/${name}`))).toBe(true);
    }
  });
});
