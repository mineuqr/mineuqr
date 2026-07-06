import { describe, expect, it } from "vitest";
import { RuntimeCategoryFilterManager } from "../category-filter/runtimeCategoryFilterManager";
import type { RuntimeConfiguration } from "../configuration/runtimeConfigurationContract";
import { kitchenDisplayRole } from "../roles/roleDefinitions";

function mockConfiguration(
  categoryIds: number[],
  version = "v1"
): RuntimeConfiguration {
  return {
    version,
    role: "kitchen_display",
    updatedAt: version,
    configurationState: "applied",
    validationErrors: [],
    usedFallback: false,
    active: { language: "en", direction: "ltr" },
    tracked: {
      density: "large",
      densityActivated: true,
      categoryIds,
      categoriesActivated: true,
    },
  };
}

describe("RuntimeCategoryFilterManager", () => {
  const capabilities = kitchenDisplayRole.metadata.capabilities;

  it("empty category list means no filtering (show all)", () => {
    const manager = new RuntimeCategoryFilterManager();
    const filter = manager.syncFromConfiguration(mockConfiguration([]), capabilities);
    expect(filter.enabled).toBe(false);
    expect(filter.mode).toBe("all");
    expect(manager.getPredicate()([1, 2])).toBe(true);
  });

  it("selected categories compile predicate once", () => {
    const manager = new RuntimeCategoryFilterManager();
    const filter = manager.syncFromConfiguration(mockConfiguration([1, 3]), capabilities);
    expect(filter.enabled).toBe(true);
    expect(filter.selectedCategories).toEqual([1, 3]);
    const predicate = manager.getPredicate();
    expect(predicate([1])).toBe(true);
    expect(predicate([2])).toBe(false);
    expect(predicate([3, 99])).toBe(true);
  });

  it("ignores invalid category ids safely", () => {
    const manager = new RuntimeCategoryFilterManager();
    const filter = manager.syncFromConfiguration(
      mockConfiguration([1, -1, 0, 2.5 as unknown as number]),
      capabilities
    );
    expect(filter.selectedCategories).toEqual([1]);
    expect(filter.validationErrors.length).toBeGreaterThan(0);
    expect(filter.ignoredCategories.length).toBeGreaterThan(0);
  });

  it("rebuilds predicate on configuration version change", () => {
    const manager = new RuntimeCategoryFilterManager();
    manager.syncFromConfiguration(mockConfiguration([1]), capabilities);
    const v1 = manager.getFilter()?.filterVersion;
    manager.syncFromConfiguration(mockConfiguration([2], "v2"), capabilities);
    const v2 = manager.getFilter()?.filterVersion;
    expect(v2).toBeGreaterThan(v1!);
    expect(manager.detectConfigurationChange("v2")).toBe(false);
    expect(manager.detectConfigurationChange("v3")).toBe(true);
  });

  it("stays inactive for blocked roles without category filter capability", () => {
    const manager = new RuntimeCategoryFilterManager();
    const config = mockConfiguration([1]);
    config.tracked.categoriesActivated = false;
    const blockedCapabilities = {
      ...capabilities,
      supportsCategoryFilter: false,
    };
    const filter = manager.syncFromConfiguration(config, blockedCapabilities);
    expect(filter.enabled).toBe(false);
    expect(manager.buildHealth()?.validationStatus).toBe("inactive");
  });

  it("reports filter health", () => {
    const manager = new RuntimeCategoryFilterManager();
    manager.syncFromConfiguration(mockConfiguration([1, 2]), capabilities);
    const health = manager.buildHealth();
    expect(health?.filterEnabled).toBe(true);
    expect(health?.selectedCategoryCount).toBe(2);
    expect(health?.filterVersion).toBeGreaterThan(0);
    expect(health?.validationStatus).toBe("valid");
  });
});
