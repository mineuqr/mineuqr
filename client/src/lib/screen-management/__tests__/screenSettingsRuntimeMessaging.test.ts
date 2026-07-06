import { describe, expect, it } from "vitest";
import {
  categorySectionHint,
  densitySectionHint,
  roleSupportsRuntimeDensityAndCategoryFilter,
  screenSettingsSheetDescription,
} from "../screenSettingsRuntimeMessaging";

describe("screenSettingsRuntimeMessaging", () => {
  it("describes immediate reload after save", () => {
    expect(screenSettingsSheetDescription(false)).toContain("configuration reload");
    expect(screenSettingsSheetDescription(true)).toContain("إعادة تحميل");
  });

  it("marks density and category filter active for kitchen and expo", () => {
    for (const role of ["kitchen_display", "expo_display"] as const) {
      expect(roleSupportsRuntimeDensityAndCategoryFilter(role)).toBe(true);
      expect(densitySectionHint(role, false).badge).toBe("Active at runtime");
      expect(categorySectionHint(role, false).badge).toBe("Active at runtime");
      expect(categorySectionHint(role, false).detail).toContain("empty");
    }
  });

  it("marks density and category stored-only for non-kitchen roles", () => {
    for (const role of ["pickup_display", "customer_display"] as const) {
      expect(roleSupportsRuntimeDensityAndCategoryFilter(role)).toBe(false);
      expect(densitySectionHint(role, false).badge).toBe("Stored");
      expect(categorySectionHint(role, false).badge).toBe("Stored");
    }
  });

  it("does not reference deferred KITCHEN program activation", () => {
    const roles = ["kitchen_display", "expo_display", "pickup_display"] as const;
    for (const role of roles) {
      const density = densitySectionHint(role, false);
      const category = categorySectionHint(role, false);
      expect(density.detail).not.toContain("KITCHEN-DISPLAY-DENSITY-1");
      expect(category.detail).not.toContain("KITCHEN-CATEGORY-FILTER-1");
      expect(density.detail).not.toMatch(/activates later/i);
      expect(category.detail).not.toMatch(/activates later/i);
    }
    expect(screenSettingsSheetDescription(false)).not.toMatch(/future programs/i);
  });
});
