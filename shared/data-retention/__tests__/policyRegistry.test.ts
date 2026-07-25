/**
 * DATA-RETENTION-PLATFORM-1 — registry resolution order.
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  buildPlatformFallbackPolicy,
  createRetentionPolicyRegistry,
} from "@shared/data-retention";

describe("RetentionPolicyRegistry", () => {
  it("resolves restaurant override → global → platform fallback", () => {
    const registry = createRetentionPolicyRegistry({
      seedPlatformFallbacks: false,
      nowIso: "2026-07-25T00:00:00.000Z",
    });

    const fallback = registry.resolve({
      entityType: "financial_shift",
      restaurantId: 1,
    });
    expect(fallback.source).toBe("platform_fallback");
    expect(fallback.policy.displayWindowDays).toBe(30);

    const global = {
      ...buildPlatformFallbackPolicy(
        "financial_shift",
        "2026-07-25T00:00:00.000Z"
      ),
      policyId: "drap.policy.financial_shift.global",
      displayWindowDays: 60,
      defaultPolicy: true,
      restaurantId: null,
    };
    registry.register(global);
    expect(
      registry.resolve({ entityType: "financial_shift", restaurantId: 9 })
        .source
    ).toBe("global_default");
    expect(
      registry.resolve({ entityType: "financial_shift", restaurantId: 9 })
        .policy.displayWindowDays
    ).toBe(60);

    const override = {
      ...global,
      policyId: "drap.policy.financial_shift.r7",
      restaurantId: 7,
      displayWindowDays: 14,
      defaultPolicy: false,
      restaurantOverrideAllowed: true,
    };
    registry.register(override);
    const resolved = registry.resolve({
      entityType: "financial_shift",
      restaurantId: 7,
    });
    expect(resolved.source).toBe("restaurant_override");
    expect(resolved.policy.displayWindowDays).toBe(14);
  });

  it("update replaces policy version", () => {
    const registry = createRetentionPolicyRegistry({
      seedPlatformFallbacks: false,
    });
    const base = {
      ...buildPlatformFallbackPolicy("order", "2026-07-25T00:00:00.000Z"),
      policyId: "p1",
    };
    registry.register(base);
    registry.update({ ...base, version: 2, displayWindowDays: 10 });
    expect(registry.get("p1")?.version).toBe(2);
    expect(registry.get("p1")?.displayWindowDays).toBe(10);
  });
});
