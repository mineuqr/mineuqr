/**
 * COMMERCIAL-ADMIN-LIMIT-ENFORCEMENT-1 — G-09 architecture guards.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("G-09 admin commercial quantity guards", () => {
  it("does not skip occupancy because the caller is admin", () => {
    const router = read("server/routers.ts");
    const categoryCreate = router.slice(
      router.indexOf("category.create"),
      router.indexOf("menuItemRouter")
    );
    expect(categoryCreate).toContain("createCategoryWithCommercialLimit(input)");
    expect(categoryCreate).not.toContain('ctx.user.role !== "admin"');
    expect(categoryCreate).not.toContain("createCategory(input)");
    const itemCreate = router.slice(
      router.indexOf("menuItemRouter"),
      router.indexOf("update: verifiedProcedure", router.indexOf("menuItemRouter"))
    );
    expect(itemCreate).toContain("createMenuItemWithCommercialLimit(input)");
    expect(itemCreate).not.toContain('ctx.user.role !== "admin"');
    expect(itemCreate).not.toContain("createMenuItem(input)");
  });

  it("reuses the shared occupancy helper rather than an admin limiter", () => {
    const limits = read("server/subscriptionPlanLimits.ts");
    const occupancy = read("server/subscription-runtime/commercialLimitOccupancy.ts");
    const router = read("server/routers.ts");
    expect(limits).toContain("withCommercialLimitOccupancy");
    expect(limits).toContain('limitKey: "categories"');
    expect(limits).toContain('limitKey: "items"');
    expect(occupancy).not.toContain("admin");
    expect(occupancy).not.toContain("PLATFORM_OWNER");
    expect(router).not.toContain("AdminOccupancyService");
    expect(router).not.toContain("AdminCommercialLimit");
    expect(read("drizzle/meta/_journal.json")).not.toContain("0095");
    expect(read("drizzle/0094_commercial_limit_occupancy_locks.sql")).not.toContain(
      "admin"
    );
  });

  it("keeps occupancy mutex then restaurant row lock order", () => {
    const limits = read("server/subscriptionPlanLimits.ts");
    const occupancy = read("server/subscription-runtime/commercialLimitOccupancy.ts");
    const mutexAt = occupancy.indexOf("acquireExistingLock");
    const parentAt = limits.indexOf("requireRestaurantRowForUpdate(tx, data.restaurantId)");
    expect(mutexAt).toBeGreaterThan(0);
    expect(parentAt).toBeGreaterThan(0);
    expect(occupancy).not.toContain("requireRestaurantRowForUpdate");
  });

  it("maps capacity failure through G-06 occupancy errors, not unauthorized", () => {
    const limits = read("server/subscriptionPlanLimits.ts");
    expect(limits).toContain("mapOccupancyError");
    expect(limits).toContain("throwCommercialOccupancyTrpcError");
    expect(limits).toContain("RestaurantGoneError");
    expect(limits).not.toContain('message: "unauthorized"');
  });
});
