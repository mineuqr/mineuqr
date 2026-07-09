import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../..");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("OPERATIONAL-WORKSPACE-1 architecture guards", () => {
  it("kitchen workspace advances orders with a single action (no cancel)", () => {
    const kitchenPanel = read("client/src/components/kitchen/KitchenWorkspacePanel.tsx");
    expect(kitchenPanel).toContain("KitchenExecutionCard");
    expect(kitchenPanel).toContain("getKitchenWorkspaceActions");
    expect(kitchenPanel).toContain("useOrderStatusActions");
    expect(kitchenPanel).not.toContain("cancel-order");
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
    expect(ordersPanel).toContain("getOrderWorkspaceActions");
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
