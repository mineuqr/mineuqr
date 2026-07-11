import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OrderLifecycleStagePolicy } from "../../domain/policies/OrderLifecycleStagePolicy";
import {
  DEFAULT_ORDER_LIFECYCLE_STAGE,
  isOperationalLifecycleStage,
} from "../../domain/value-objects/OrderLifecycleStage";

const repoRoot = join(__dirname, "../../../..");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDER-LIFECYCLE-ARCHIVE-1 architecture guards", () => {
  it("defines OrderLifecycleStage as an official domain concept", () => {
    const stage = read("server/order/domain/value-objects/OrderLifecycleStage.ts");
    const policy = read("server/order/domain/policies/OrderLifecycleStagePolicy.ts");

    expect(stage).toContain('ORDER_LIFECYCLE_STAGES = ["active", "completed", "archived"]');
    expect(stage).toContain("DEFAULT_ORDER_LIFECYCLE_STAGE");
    expect(policy).toContain("OrderLifecycleStagePolicy");
    expect(policy).toContain("ACTIVE → COMPLETED → ARCHIVED");
  });

  it("governs lifecycle transitions through AdvanceOrderLifecycleService", () => {
    const service = read("server/order/application/AdvanceOrderLifecycleService.ts");
    const composition = read("server/order/composition.ts");
    const aggregate = read("server/order/domain/aggregate/Order.ts");

    expect(service).toContain("AdvanceOrderLifecycleService");
    expect(service).toContain("advanceLifecycleStage");
    expect(composition).toContain("advanceOrderLifecycleService");
    expect(aggregate).toContain("advanceLifecycleStage");
  });

  it("exposes lifecycle explicitly on read model DTOs", () => {
    const contracts = read("server/order/read/domain/contracts/queryContracts.ts");
    const mapper = read("server/order/read/presentation/mapActiveOrderItemDto.ts");

    expect(contracts).toContain("lifecycle: string");
    expect(mapper).toContain("lifecycle: row.lifecycle");
  });

  it("filters operational workspaces by lifecycle stage, not terminal status", () => {
    const operationalStore = read("server/order/read/infrastructure/DrizzleOrderOperationalReadStore.ts");
    const kitchenAdapter = read("server/kitchen/read/infrastructure/OrderReadQueryAdapter.ts");
    const printStore = read("server/print-workspace/read/infrastructure/DrizzlePrintWorkspaceReadStore.ts");
    const projectionStore = read(
      "server/order/read/infrastructure/persistence/drizzle/DrizzleOrderReadProjectionStore.ts"
    );

    expect(operationalStore).toContain("lifecycleStage");
    expect(operationalStore).toContain("operationalLifecycleFilter()");
    expect(operationalStore).not.toMatch(/isActive,\s*true[\s\S]*listActiveOrders/);
    expect(kitchenAdapter).toContain("operationalLifecycleFilter()");
    expect(printStore).toContain("operationalLifecycleFilter()");
    expect(projectionStore).toContain("isOperationalLifecycleStage(lifecycleStage)");
    expect(projectionStore).not.toMatch(/isActive = isActiveOrderStatus/);
  });

  it("does not infer lifecycle from status in projection lifecycle helpers", () => {
    const lifecycle = read("server/order/read/projections/materializers/projectionLifecycle.ts");
    expect(lifecycle).toContain("never infer lifecycle from operational status");
    expect(lifecycle).not.toMatch(/status === "served"/);
    expect(lifecycle).not.toMatch(/status === "cancelled"/);
  });

  it("enforces monotonic lifecycle transitions", () => {
    expect(OrderLifecycleStagePolicy.canTransition("active", "completed")).toBe(true);
    expect(OrderLifecycleStagePolicy.canTransition("completed", "archived")).toBe(true);
    expect(OrderLifecycleStagePolicy.canTransition("active", "archived")).toBe(false);
    expect(OrderLifecycleStagePolicy.canTransition("archived", "active")).toBe(false);
    expect(OrderLifecycleStagePolicy.canTransition("completed", "active")).toBe(false);
  });

  it("defaults operational lifecycle to active", () => {
    expect(DEFAULT_ORDER_LIFECYCLE_STAGE).toBe("active");
    expect(isOperationalLifecycleStage("active")).toBe(true);
    expect(isOperationalLifecycleStage("completed")).toBe(false);
    expect(isOperationalLifecycleStage("archived")).toBe(false);
  });

  it("persists lifecycle independently on write and read projections", () => {
    const schema = read("drizzle/schema.ts");
    const migration = read("drizzle/0062_order_lifecycle_stage.sql");
    const repository = read("server/order/infrastructure/persistence/DrizzleOrderRepository.ts");

    expect(schema).toContain('lifecycleStage: mysqlEnum(["active", "completed", "archived"])');
    expect(migration).toContain("lifecycleStage");
    expect(repository).toContain("lifecycleStage: order.lifecycleStage");
  });

  it("subscribes projection consumers to OrderLifecycleStageChanged", () => {
    const consumers = read(
      "server/order/read/projections/consumers/createOrderReadProjectionConsumers.ts"
    );
    expect(consumers).toContain("OrderLifecycleStageChanged");
  });
});

describe("ORDER-LIFECYCLE-ARCHIVE-1 lifecycle policy", () => {
  it("allows only active → completed → archived", () => {
    expect(OrderLifecycleStagePolicy.canTransition("active", "completed")).toBe(true);
    expect(OrderLifecycleStagePolicy.canTransition("completed", "archived")).toBe(true);
    expect(OrderLifecycleStagePolicy.canTransition("active", "archived")).toBe(false);
  });
});
