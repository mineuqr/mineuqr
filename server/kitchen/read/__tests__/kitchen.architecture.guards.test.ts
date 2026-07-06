import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("KITCHEN-DISPLAY-1 architecture guards", () => {
  it("OrderReadQueryAdapter reads only order_read projection tables", () => {
    const source = readFileSync(join(root, "infrastructure/OrderReadQueryAdapter.ts"), "utf8");
    expect(source).toContain("orderReadOrders");
    expect(source).toContain("orderReadOrderLineItems");
    expect(source).toContain("orderReadOrderTimeline");
    expect(source).not.toMatch(/getOrderById|getOrdersWithItems|from\(orders\)/);
  });

  it("kitchen module has no kitchen_read tables or projection consumer", () => {
    const service = readFileSync(join(root, "services/KitchenReadService.ts"), "utf8");
    const router = readFileSync(join(root, "kitchenRouter.ts"), "utf8");
    expect(service).not.toContain("KitchenQueueProjectionConsumer");
    expect(service).not.toContain("kitchen_read_");
    expect(router).toContain("kitchen.read.getQueue");
    expect(router).toContain("assertRestaurantAccess");
  });

  it("P-07 lifecycle is queryable logical context without consumer", () => {
    const registry = readFileSync(
      join(root, "../../order/read/projections/lifecycle/ProjectionLifecycleRegistry.ts"),
      "utf8"
    );
    expect(registry).toContain('"P-07-kitchen-queue"');
    expect(registry).toMatch(/P-07-kitchen-queue[\s\S]*lifecycleState: "queryable"/);
    expect(registry).toMatch(/P-07-kitchen-queue[\s\S]*consumerName: null/);
  });

  it("kitchen router is registered on app router", () => {
    const routers = readFileSync(join(root, "../../routers.ts"), "utf8");
    expect(routers).toContain("kitchenRouter");
    expect(routers).toContain("kitchen: kitchenRouter");
  });

  it("QueueOrderingPolicy abstraction exists with fifo default", () => {
    const policy = readFileSync(join(root, "domain/ordering/FifoByCreatedAtPolicy.ts"), "utf8");
    expect(policy).toContain("KITCHEN_ORDERING_POLICY_FIFO");
    expect(readFileSync(join(root, "services/KitchenReadService.ts"), "utf8")).toContain(
      "orderingPolicy"
    );
  });

  it("BUGFIX-F008 — database unavailability is not silently returned as empty queue", () => {
    const adapter = readFileSync(join(root, "infrastructure/OrderReadQueryAdapter.ts"), "utf8");
    expect(adapter).toContain("KITCHEN_READ_DATABASE_UNAVAILABLE");
    expect(adapter).not.toMatch(/if \(!db\) return \[\]/);
  });
});
