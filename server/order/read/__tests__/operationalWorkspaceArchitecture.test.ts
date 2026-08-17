import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../..");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("OPERATIONAL-WORKSPACE-1 architecture guards", () => {
  it("dashboard no longer hosts a kitchen execution workspace", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");
    expect(dashboard).not.toContain("KitchenWorkspacePanel");
    expect(dashboard).not.toContain('activeTab === "kitchen"');
  });

  it("operational kitchen screen executes via device runtime", () => {
    const kitchenScreen = read("client/src/components/operational-screen/KitchenScreenPanel.tsx");
    expect(kitchenScreen).toContain("KitchenExecutionCard");
    expect(kitchenScreen).toContain("useKitchenRuntimeStream");
    expect(kitchenScreen).toContain("useOperationalDeviceOrderActions");
    expect(kitchenScreen).toContain("resolveOperationalScreenAction");
    expect(kitchenScreen).not.toContain("accept-order");
    expect(kitchenScreen).not.toContain("useOrderStatusActions");
    expect(kitchenScreen).not.toContain("order.updateStatus");
  });

  it("kitchen execution card exposes advance action only (no cancel)", () => {
    const card = read("client/src/components/kitchen/KitchenExecutionCard.tsx");
    expect(card).toContain("onAction");
    expect(card).not.toContain("cancel-order");
    expect(card).not.toMatch(/onStartPreparing|onMarkReady|onMarkServed|updateStatus/);
  });

  it("orders workspace owns lifecycle actions", () => {
    const ordersPanel = read("client/src/components/orders-workspace/OrdersWorkspacePanel.tsx");
    expect(ordersPanel).toContain("useOrderStatusActions");
    expect(ordersPanel).toContain("getOrdersWorkspaceActions");
  });

  it("order read router is read-only over projections", () => {
    const router = read("server/order/read/orderReadRouter.ts");
    expect(router).toContain("listActive");
    expect(router).toContain("getTimeline");
    expect(router).not.toMatch(/mutation|updateStatus/);
  });

  it("P-07 remains queryable without kitchen consumer", () => {
    const registry = read(
      "server/order/read/projections/lifecycle/ProjectionLifecycleRegistry.ts"
    );
    expect(registry).toMatch(/P-07[\s\S]*queryable/);
    expect(registry).toMatch(/consumerName:\s*null/);
  });
});
