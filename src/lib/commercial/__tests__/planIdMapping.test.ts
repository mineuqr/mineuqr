import { describe, expect, it } from "vitest";
import {
  mapPlanIdToCatalogPlan,
  PLAN_ID_TO_CATALOG_PLAN,
} from "../planIdMapping";

describe("mapPlanIdToCatalogPlan", () => {
  it("maps all approved plan IDs per PLAN-ID-MAPPING.md", () => {
    expect(PLAN_ID_TO_CATALOG_PLAN[30001]).toBe("BASIC");
    expect(PLAN_ID_TO_CATALOG_PLAN[30002]).toBe("PROFESSIONAL");
    expect(PLAN_ID_TO_CATALOG_PLAN[30003]).toBe("ENTERPRISE");
  });

  it("returns BASIC for 30001", () => {
    expect(mapPlanIdToCatalogPlan(30001)).toBe("BASIC");
  });

  it("returns PROFESSIONAL for 30002", () => {
    expect(mapPlanIdToCatalogPlan(30002)).toBe("PROFESSIONAL");
  });

  it("returns ENTERPRISE for 30003", () => {
    expect(mapPlanIdToCatalogPlan(30003)).toBe("ENTERPRISE");
  });

  it("returns null for unknown plan IDs", () => {
    expect(mapPlanIdToCatalogPlan(99999)).toBeNull();
    expect(mapPlanIdToCatalogPlan(0)).toBeNull();
  });
});
