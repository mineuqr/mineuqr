import { describe, expect, it } from "vitest";
import { commercialOverviewPlanRows } from "./commercialOverviewPlanDistribution";

describe("commercialOverviewPlanRows (EXEC-7C.6)", () => {
  it("shows all canonical plans with snapshot counts and zero for absent entries", () => {
    const rows = commercialOverviewPlanRows([
      { planCode: "PROFESSIONAL", ownerCount: 3 },
      { planCode: "NONE", ownerCount: 1 },
    ]);

    expect(rows).toHaveLength(6);
    expect(rows.find((r) => r.planCode === "PROFESSIONAL")?.ownerCount).toBe(3);
    expect(rows.find((r) => r.planCode === "NONE")?.ownerCount).toBe(1);
    expect(rows.find((r) => r.planCode === "ENTERPRISE")?.ownerCount).toBe(0);
    expect(rows.find((r) => r.planCode === "TRIAL")?.ownerCount).toBe(0);
  });

  it("returns empty array when entries are undefined during load", () => {
    expect(commercialOverviewPlanRows(undefined)).toEqual([]);
  });
});
