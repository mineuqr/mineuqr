/**
 * COMMERCIAL-INACTIVE-OCCUPANCY-POLICY-1 — G-10 architecture guards.
 * Policy: catalog/location COUNT(*) all persisted rows; POS COUNT provisioned lifecycles.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("G-10 inactive occupancy policy guards", () => {
  it("restaurant/category/item occupancy COUNT does not filter operational flags", () => {
    const limits = read("server/subscriptionPlanLimits.ts");
    const restaurantFn = limits.slice(
      limits.indexOf("export async function createRestaurantWithCommercialLimit")
    );
    const categoryFn = limits.slice(
      limits.indexOf("export async function createCategoryWithCommercialLimit")
    );
    const itemFn = limits.slice(
      limits.indexOf("export async function createMenuItemWithCommercialLimit")
    );
    expect(restaurantFn).toContain("eq(restaurants.userId, ownerUserId)");
    expect(restaurantFn.slice(0, restaurantFn.indexOf("createCategoryWithCommercialLimit"))).not.toContain("isActive");
    expect(categoryFn).toContain("count(*)");
    expect(
      categoryFn.slice(0, categoryFn.indexOf("createMenuItemWithCommercialLimit"))
    ).not.toContain("isActive");
    expect(itemFn).toContain("count(*)");
    expect(itemFn).not.toContain("isAvailable");
    const stats = read("server/db.ts");
    const statsFn = stats.slice(stats.indexOf("export async function getRestaurantStats"));
    const statsBody = statsFn.slice(0, statsFn.indexOf("export async function getSubscriptionPlans"));
    expect(statsBody).toContain("count(*)");
    expect(statsBody).not.toContain("isActive");
    expect(statsBody).not.toContain("isAvailable");
  });

  it("POS occupancy counts provisioned lifecycles only; deactivate does not wrap occupancy", () => {
    const pos = read("server/pos/services/PosTerminalService.ts");
    const terminal = read("shared/pos/terminal.ts");
    expect(terminal).toContain('lifecycle === "registered" || lifecycle === "active"');
    expect(terminal).not.toContain('lifecycle === "deactivated"');
    expect(pos).toContain("isProvisionedLifecycle(row.lifecycle)");
    expect(pos).not.toMatch(
      /async deactivate[\s\S]{0,500}withCommercialLimitOccupancy/
    );
    expect(pos).toContain("occupancyDelta: 0");
    expect(pos).toContain("consumeProvisionedSlot");
  });

  it("does not introduce inactive counters, grace tables, or role-specific occupancy", () => {
    const occupancy = read("server/subscription-runtime/commercialLimitOccupancy.ts");
    const journal = read("drizzle/meta/_journal.json");
    expect(occupancy).not.toContain("inactive");
    expect(occupancy).not.toContain("grace");
    expect(occupancy).not.toContain("occupied = occupied");
    expect(journal).not.toContain("0095");
    expect(read("server/routers.ts")).not.toContain("AdminInactiveOccupancy");
  });
});
