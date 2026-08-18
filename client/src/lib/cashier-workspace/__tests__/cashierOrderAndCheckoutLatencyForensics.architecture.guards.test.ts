/**
 * CASHIER-ORDER-AND-CHECKOUT-LATENCY-FORENSICS-1 — client boundary guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CASHIER-ORDER-AND-CHECKOUT-LATENCY-FORENSICS-1 client guards", () => {
  it("patches the All Orders listActive key used by the workspace", () => {
    const actions = read(
      "client/src/lib/operational-workspace/useOrderStatusActions.ts"
    );
    const panel = read(
      "client/src/components/orders-workspace/OrdersWorkspacePanel.tsx"
    );
    expect(actions).toContain("{ restaurantId, limit: 100 }");
    expect(actions).toContain("status: undefined");
    expect(actions).toContain('status: "pending"');
    expect(panel).toContain("trpc.order.read.listActive.useQuery");
    expect(panel).toContain("limit: 100");
  });

  it("Cashier still does not import order.read", () => {
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    expect(panel).not.toContain("trpc.order.read");
    expect(panel).toContain("invalidateOrderReads");
  });
});
