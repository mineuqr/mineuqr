import { describe, expect, it } from "vitest";
import {
  isUpgradedCategoryProjection,
  validateStoredCategoryProjection,
} from "../categoryProjectionValidation";
import { sampleCategoryProjection } from "../../../__tests__/fixtures/categoryProjectionFixtures";

describe("categoryProjectionValidation", () => {
  it("accepts canonical stored projection", () => {
    const projection = sampleCategoryProjection({ categoryId: 3 });
    expect(isUpgradedCategoryProjection(projection, 1)).toBe(true);
    expect(validateStoredCategoryProjection(projection, 1).valid).toBe(true);
  });

  it("rejects null and empty legacy projections", () => {
    expect(isUpgradedCategoryProjection(null, 1)).toBe(false);
    expect(isUpgradedCategoryProjection({}, 1)).toBe(false);
    expect(validateStoredCategoryProjection({}, 1).valid).toBe(false);
  });

  it("rejects invalid category code", () => {
    const bad = { ...sampleCategoryProjection(), categoryCode: "invalid" };
    expect(validateStoredCategoryProjection(bad, 1).valid).toBe(false);
  });
});
