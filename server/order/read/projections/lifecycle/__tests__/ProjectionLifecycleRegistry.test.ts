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

  it("lists infrastructure candidates for order read module", () => {
    const registry = new ProjectionLifecycleRegistry();
    const candidates = registry.listMaterializingCandidates();
    const orderReadOwned = candidates.filter((c) => c.ownerModule === "server/order/read");
    expect(orderReadOwned.length).toBeGreaterThanOrEqual(6);
    expect(orderReadOwned.every((c) => c.lifecycleState === "materializing")).toBe(true);
  });

  it("marks kitchen and printing as defined only", () => {
    const registry = new ProjectionLifecycleRegistry();
    expect(registry.getDefinition("P-07-kitchen-queue")?.lifecycleState).toBe("defined");
    expect(registry.getDefinition("P-08-printing-queue")?.lifecycleState).toBe("defined");
  });

  it("aligns query bindings to catalog projections", () => {
    const registry = new ProjectionLifecycleRegistry();
    for (const binding of ORDER_READ_QUERY_BINDINGS) {
      expect(registry.getDefinition(binding.primaryProjectionId)).toBeDefined();
    }
  });
});
