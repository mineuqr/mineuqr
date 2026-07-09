import { describe, expect, it } from "vitest";
import { COMFORTABLE_DENSITY_MODEL, COMPACT_DENSITY_MODEL } from "../presentationDensityModels";

describe("presentationDensityModels", () => {
  it("derives max visible line items from density tier", () => {
    expect(COMFORTABLE_DENSITY_MODEL.maxVisibleLineItems).toBe(6);
    expect(COMPACT_DENSITY_MODEL.maxVisibleLineItems).toBe(4);
  });
});
