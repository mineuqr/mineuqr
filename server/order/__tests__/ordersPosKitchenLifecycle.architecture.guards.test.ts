/**
 * ORDERS-POS-KITCHEN-LIFECYCLE-1 — architecture boundary guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDERS-POS-KITCHEN-LIFECYCLE-1 architecture guards", () => {
  it("identifies POS Orders by canonical cashier_pos, not identityScope", () => {
    expect(ORDERING_CHANNEL_CASHIER_POS).toBe("cashier_pos");
    const lifecycle = read("server/order/application/cashierPosOrderLifecycle.ts");
    const actions = read("client/src/lib/operational-workspace/operationalActions.ts");
    const panel = read("client/src/components/orders-workspace/OrdersWorkspacePanel.tsx");
    expect(lifecycle).toContain("ORDERING_CHANNEL_CASHIER_POS");
    expect(actions).toContain("ORDERING_CHANNEL_CASHIER_POS");
    expect(panel).toContain("orderingChannel");
    expect(lifecycle).not.toContain("identityScope");
    expect(actions).not.toContain("POS_SEATS");
  });

  it("applies existing pending → preparing on cashier_pos PlaceOrder", () => {
    const place = read("server/order/application/PlaceOrderService.ts");
    expect(place).toContain("cashier-pos-inbound-accept");
    expect(place).toContain("CASHIER_POS_INBOUND_STATUS");
    expect(place).toContain("ORDERING_CHANNEL_CASHIER_POS");
    expect(place).not.toContain('status: "preparing"');
  });

  it("completes POS Orders through existing served + settlement guard", () => {
    const complete = read(
      "server/order/application/CompleteCashierPosOperationalService.ts"
    );
    const routers = read("server/routers.ts");
    const policy = read("server/order/domain/policies/OrderLifecyclePolicy.ts");
    expect(complete).toContain("assertCashierPosOrderCompletable");
    expect(complete).toContain("nextCashierPosServeStep");
    expect(routers).toContain("completeCashierPosOperationalService");
    expect(policy).toContain('pending: ["preparing", "cancelled"]');
    expect(policy).toContain('ready: ["served"]');
  });

  it("Kitchen still composes from Order Read Model pipeline statuses", () => {
    const kitchen = read("server/kitchen/read/services/KitchenReadService.ts");
    const adapter = read(
      "server/kitchen/read/infrastructure/OrderReadQueryAdapter.ts"
    );
    expect(kitchen).toContain("listPipelineOrders");
    expect(adapter).toContain('["pending", "preparing", "ready"]');
    expect(kitchen).not.toContain("cashier_pos");
    expect(kitchen).not.toContain("pos_kitchen");
  });

  it("does not add POS Kitchen or Cashier revenue ownership", () => {
    const panel = read("client/src/components/orders-workspace/OrdersWorkspacePanel.tsx");
    const actions = read("client/src/lib/operational-workspace/operationalActions.ts");
    expect(panel).not.toContain("pos_revenue");
    expect(panel).not.toContain("checkLimit");
    expect(actions).not.toContain("checkLimit");
  });
});
