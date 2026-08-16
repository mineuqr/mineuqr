/**
 * COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1 — G-11 architecture guards.
 * Policy B: existing resources stay operational; new capacity is blocked.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("G-11 downgrade occupancy policy guards", () => {
  it("does not invent freeze, debt, grace, or auto-cleanup on plan bind", () => {
    const helper = read("server/subscription-runtime/commercialLimitOccupancy.ts");
    const bind = read("server/services/commercial-catalog/adoptionService.ts");
    const journal = read("drizzle/meta/_journal.json");
    expect(helper).not.toContain("downgrade_debt");
    expect(helper).not.toContain("commercial_downgrade_occupancy");
    expect(helper).not.toContain("grace");
    expect(helper).not.toContain("autoDeactivate");
    expect(helper).not.toContain("autoDelete");
    expect(bind).not.toContain("deleteRestaurant");
    expect(bind).not.toContain("isActive = 0");
    expect(bind).not.toContain("lifecycle: \"deactivated\"");
    expect(journal).not.toContain("0095");
  });

  it("keeps checkLimit as the cap oracle and COUNT as occupancy", () => {
    const helper = read("server/subscription-runtime/commercialLimitOccupancy.ts");
    const enforcement = read("server/subscription-runtime/enforcement.ts");
    expect(helper).toContain("input.decide(proposedTotal)");
    expect(helper).toContain("input.countOccupancy(tx)");
    expect(helper).toContain("occupancy + delta");
    expect(enforcement).toContain("const allowed = input.proposedTotal <= cap");
    expect(helper).not.toContain("occupied = occupied");
  });

  it("allows occupancyDelta 0 through a hard limit_exceeded without changing G-10 COUNT", () => {
    const helper = read("server/subscription-runtime/commercialLimitOccupancy.ts");
    const limits = read("server/subscriptionPlanLimits.ts");
    const pos = read("server/pos/services/PosTerminalService.ts");
    expect(helper).toContain("function isNewCapacityDenial");
    expect(helper).toContain("occupancyDelta === 0");
    expect(helper).toContain('decision.reasonCode === "limit_exceeded"');
    expect(pos).toContain("occupancyDelta");
    expect(limits).not.toContain("isActive");
    expect(limits).not.toContain("isAvailable");
  });

  it("does not invent occupancy for staffAccounts, branches, devices, or screens", () => {
    const helper = read("server/subscription-runtime/commercialLimitOccupancy.ts");
    expect(helper).not.toContain('"staffAccounts"');
    expect(helper).not.toContain('"branches"');
    expect(helper).not.toContain('"devices"');
    expect(helper).not.toContain('"screens"');
  });

  it("restaurant update/delete do not go through a downgrade freeze path", () => {
    const routers = read("server/routers.ts");
    const updateFn = routers.slice(routers.indexOf("update: verifiedProcedure"));
    const updateBody = updateFn.slice(0, updateFn.indexOf("delete: verifiedProcedure"));
    expect(updateBody).toContain("updateRestaurant");
    expect(updateBody).not.toContain("withCommercialLimitOccupancy");
    expect(updateBody).not.toContain("checkLimit");
    expect(updateBody).not.toContain("autoDeactivate");
  });
});
