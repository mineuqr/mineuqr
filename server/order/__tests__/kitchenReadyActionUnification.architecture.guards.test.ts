/**
 * KITCHEN-READY-ACTION-UNIFICATION-1 — ownership, auth, and financial isolation.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  rolePermitsOrderAction,
  targetStatusForDeviceAction,
  validateDeviceOrderAction,
} from "../../operational-device/domain/deviceOrderExecution";

const repoRoot = join(__dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("KITCHEN-READY-ACTION-UNIFICATION-1 architecture", () => {
  it("Kitchen Ready uses the canonical AdvanceOrderStatusService preparing → ready", () => {
    expect(targetStatusForDeviceAction("mark-ready")).toBe("ready");
    expect(validateDeviceOrderAction("kitchen_display", "mark-ready", "preparing")).toEqual({
      ok: true,
    });
    const device = read("server/operational-device/services/DeviceOrderExecutionService.ts");
    expect(device).toContain("advanceOrderStatusService.execute");
    expect(device).toContain("targetStatusForDeviceAction");
    expect(device).not.toContain("completeCashierPosOperationalService");
    expect(device).not.toContain("kitchenMarkReady");
    expect(device).not.toContain("commitCollectionFact");
  });

  it("Kitchen cannot serve; unauthorized roles cannot mark Ready", () => {
    expect(rolePermitsOrderAction("kitchen_display", "serve-order")).toBe(false);
    expect(rolePermitsOrderAction("pickup_display", "mark-ready")).toBe(false);
    expect(rolePermitsOrderAction("customer_display", "mark-ready")).toBe(false);
    expect(validateDeviceOrderAction("kitchen_display", "serve-order", "ready")).toEqual({
      ok: false,
      code: "role_forbidden",
    });
    expect(validateDeviceOrderAction("pickup_display", "mark-ready", "preparing")).toEqual({
      ok: false,
      code: "role_forbidden",
    });
  });

  it("device execution enforces restaurant isolation before transition", () => {
    const device = read("server/operational-device/services/DeviceOrderExecutionService.ts");
    expect(device).toContain("order.restaurantId !== session.restaurantId");
    expect(device).toContain('code: "FORBIDDEN"');
    expect(device).toContain("validateDeviceOrderAction");
  });

  it("Cashier Ready is a single preparing → ready persist, not the served walk", () => {
    const routers = read("server/routers.ts");
    const updateStart = routers.indexOf("  updateStatus: verifiedProcedure");
    const updateStatus = routers.slice(updateStart, updateStart + 2500);
    expect(updateStatus).toContain('input.status === "served"');
    expect(updateStatus).toContain("completeCashierPosOperationalService.execute");
    expect(updateStatus).toContain("advanceOrderStatusService.execute");
    expect(updateStatus).not.toContain("commitCollectionFact");
    expect(updateStatus).not.toContain("confirmPayment");

    const actions = read("client/src/lib/operational-workspace/operationalActions.ts");
    expect(actions).toContain("CASHIER_POS_READY");
    expect(actions).toContain('labelAr: "جاهز"');
    expect(actions).toContain('if (status === "preparing") return withPrintAction([CASHIER_POS_READY]');
    expect(actions).toContain('if (status === "ready") return withPrintAction([CASHIER_POS_SERVE]');
  });

  it("Ready and Served do not attach tax or Collection Fact behavior", () => {
    const advance = read("server/order/application/AdvanceOrderStatusService.ts");
    const device = read("server/operational-device/services/DeviceOrderExecutionService.ts");
    const complete = read("server/order/application/CompleteCashierPosOperationalService.ts");
    for (const source of [advance, device, complete]) {
      expect(source).not.toContain("commitCollectionFact");
      expect(source).not.toContain("confirmPayment");
      expect(source).not.toContain("markPaid");
      expect(source).not.toContain("taxInvoice");
      expect(source).not.toContain("dispatchCompliance");
    }
  });

  it("Kitchen Screen queries the active (not-ready) queue through existing realtime invalidation", () => {
    const stream = read("client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts");
    const activeQueue = read("client/src/lib/operational-screen/kitchen/kitchenActiveQueue.ts");
    const actions = read("client/src/lib/operational-workspace/useOrderStatusActions.ts");
    const deviceActions = read(
      "client/src/lib/operational-screen/interaction/useOperationalDeviceOrderActions.ts"
    );
    expect(stream).toContain("kitchenQueueStatusForRole");
    expect(activeQueue).toContain('"active"');
    expect(stream).toContain("useKitchenRuntimeRealtime");
    expect(actions).toContain('status: "active"');
    expect(deviceActions).toContain("getKitchenQueue.invalidate");
    expect(deviceActions).not.toContain("removeOrderFromLocalState");
  });
});
