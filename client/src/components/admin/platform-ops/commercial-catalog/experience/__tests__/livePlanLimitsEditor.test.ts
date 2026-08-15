import { describe, expect, it } from "vitest";
import { limitsFromProfileValues } from "../LivePlanLimitsEditor";

describe("limitsFromProfileValues", () => {
  it("loads persisted restaurants/categories/items including null unlimited", () => {
    expect(
      limitsFromProfileValues([
        { limitKey: "restaurants", value: 5 },
        { limitKey: "categories", value: 25 },
        { limitKey: "items", value: null },
      ])
    ).toEqual([
      { limitKey: "restaurants", value: 5 },
      { limitKey: "categories", value: 25 },
      { limitKey: "items", value: null },
    ]);
  });

  it("does not hardcode Basic/Professional/Enterprise values", () => {
    expect(limitsFromProfileValues([{ limitKey: "restaurants", value: 2 }])).toEqual([
      { limitKey: "restaurants", value: 2 },
      { limitKey: "categories", value: 0 },
      { limitKey: "items", value: 0 },
    ]);
  });
});
