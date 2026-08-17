/**
 * CASHIER-ORDER-VISIBILITY-AND-NOTIFICATION-1 — boundary guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CASHIER-ORDER-VISIBILITY-AND-NOTIFICATION-1 architecture guards", () => {
  it("keeps Order as SSOT and lists cashier_pos only after a Paid Check", () => {
    const list = read(
      "server/order/read/infrastructure/DrizzleOrderOperationalReadStore.ts"
    );
    const kitchen = read(
      "server/kitchen/read/infrastructure/OrderReadQueryAdapter.ts"
    );
    const visibility = read("server/order/read/cashierPosOperationalVisibility.ts");
    expect(visibility).toContain("isCashierPosOperationallyListed");
    expect(visibility).toContain("checkOrderMembership");
    expect(visibility).toContain("operationalChecks");
    expect(visibility).toContain("paid");
    expect(visibility).toContain("complimentary");
    expect(visibility).not.toMatch(/\bcheck_id\b/);
    expect(visibility).not.toMatch(/\border_id\b/);
    expect(visibility).not.toMatch(/\brestaurant_id\b/);
    expect(list).toContain("cashierPosPaidOperationalVisibilitySql");
    expect(kitchen).toContain("cashierPosPaidOperationalVisibilitySql");
    expect(list).not.toContain("pos_orders");
    expect(list).not.toContain("cashier_orders");
    expect(visibility).not.toContain("pos_revenue");
  });

  it("does not create inbound new_order for cashier_pos", () => {
    const consumer = read(
      "server/order/infrastructure/events/consumers/OrderNotificationConsumer.ts"
    );
    expect(consumer).toContain("ORDERING_CHANNEL_CASHIER_POS");
    expect(consumer).toContain("getOrderById(event.orderId)");
    expect(consumer).toContain("notificationType: \"new_order\"");
  });

  it("completes leftover served + active lifecycle through existing serve", () => {
    const advance = read("server/order/application/AdvanceOrderStatusService.ts");
    const complete = read(
      "server/order/application/CompleteCashierPosOperationalService.ts"
    );
    const actions = read("client/src/lib/operational-workspace/operationalActions.ts");
    expect(advance).toContain('advanceLifecycleStage("completed"');
    expect(complete).toContain('previousStatus === "served"');
    expect(complete).toContain("this.advance.execute");
    expect(actions).toContain("CASHIER_POS_SERVE");
    expect(actions).toContain("settled Check cannot be voided");
    expect(actions).not.toContain('if (status === "served" || status === "cancelled") return []');
  });
});
