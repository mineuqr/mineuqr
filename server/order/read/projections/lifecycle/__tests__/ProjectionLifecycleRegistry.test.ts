import { describe, expect, it } from "vitest";
import {
  ORDER_PROJECTION_DEFINITIONS,
  ProjectionLifecycleRegistry,
} from "../ProjectionLifecycleRegistry";
import { ORDER_READ_QUERY_BINDINGS } from "../../../domain/contracts/queryContracts";

describe("ProjectionLifecycleRegistry", () => {
  it("seeds all RA-02 projections", () => {
    const registry = new ProjectionLifecycleRegistry();
    expect(registry.listDefinitions()).toHaveLength(ORDER_PROJECTION_DEFINITIONS.length);
    expect(registry.getDefinition("P-02-active-orders")?.consumerName).toBe(
      "ActiveOrdersProjectionConsumer"
    );
  });

  it("lists queryable order-read projections after Phase 3B activation", () => {
    const registry = new ProjectionLifecycleRegistry();
    const orderReadQueryable = registry
      .listByLifecycleState("queryable")
      .filter((c) => c.ownerModule === "server/order/read");
    expect(orderReadQueryable.length).toBeGreaterThanOrEqual(6);
    expect(
      orderReadQueryable.some((c) => c.id === "P-02-active-orders")
    ).toBe(true);
  });

  it("marks kitchen as queryable logical read context and printing as defined only", () => {
    const registry = new ProjectionLifecycleRegistry();
    expect(registry.getDefinition("P-07-kitchen-queue")?.lifecycleState).toBe("queryable");
    expect(registry.getDefinition("P-07-kitchen-queue")?.consumerName).toBeNull();
    expect(registry.getDefinition("P-08-printing-queue")?.lifecycleState).toBe("defined");
  });

  it("aligns query bindings to catalog projections", () => {
    const registry = new ProjectionLifecycleRegistry();
    for (const binding of ORDER_READ_QUERY_BINDINGS) {
      expect(registry.getDefinition(binding.primaryProjectionId)).toBeDefined();
    }
  });
});
