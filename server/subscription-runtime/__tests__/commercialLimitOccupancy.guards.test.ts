/**
 * COMMERCIAL-LIMIT-OCCUPANCY-IMPLEMENTATION-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("commercial limit occupancy architecture guards", () => {
  it("owns a tenant-scoped lock table that is not a counter or catalog limit", () => {
    const sql = read("drizzle/0094_commercial_limit_occupancy_locks.sql");
    const helper = read("server/subscription-runtime/commercialLimitOccupancy.ts");
    expect(sql).toContain("CREATE TABLE `commercial_limit_occupancy_locks`");
    expect(sql).toContain("PRIMARY KEY(`scopeKind`,`scopeId`,`limitKey`)");
    expect(sql).not.toContain("occupied");
    expect(sql).not.toContain("commercial_limit_values");
    expect(helper).toContain("FOR UPDATE");
    expect(helper).toContain("INSERT IGNORE");
    expect(helper).toContain("read committed");
    expect(helper).not.toContain("ON DUPLICATE KEY UPDATE");
    expect(helper).not.toContain("FROM commercial_limit_values");
    expect(helper).not.toContain("GET_LOCK");
  });

  it("keeps checkLimit as the cap oracle and COUNT in the caller", () => {
    const helper = read("server/subscription-runtime/commercialLimitOccupancy.ts");
    expect(helper).toContain("input.decide(proposedTotal)");
    expect(helper).toContain("input.countOccupancy(tx)");
    expect(helper).toContain("input.create(tx)");
    expect(helper).toContain("input.resolveExisting");
    expect(helper).not.toContain("occupied = occupied + 1");
  });

  it("adopts restaurants, categories, items, and POS terminals", () => {
    const limits = read("server/subscriptionPlanLimits.ts");
    const router = read("server/routers.ts");
    const pos = read("server/pos/services/PosTerminalService.ts");
    expect(limits).toContain("createRestaurantWithCommercialLimit");
    expect(limits).toContain('limitKey: "restaurants"');
    expect(limits).toContain('limitKey: "categories"');
    expect(limits).toContain('limitKey: "items"');
    expect(router).toContain("createRestaurantWithCommercialLimit");
    expect(router).toContain("createCategoryWithCommercialLimit");
    expect(router).toContain("createMenuItemWithCommercialLimit");
    expect(pos).toContain("withCommercialLimitOccupancy");
    expect(pos).toContain("POS_TERMINALS_LIMIT_KEY");
    expect(pos).toContain("occupancyDelta");
    expect(pos).not.toContain("performReplace(null)");
    expect(pos).not.toContain("PosOccupancyService");
    expect(pos).not.toContain("GET_LOCK");
  });

  it("requires restaurant cascade to delete POS terminals rather than filter orphans from COUNT", () => {
    const cascade = read("server/db/cascadeDeletes.ts");
    const occupancy = read("server/subscription-runtime/commercialLimitOccupancy.ts");
    expect(cascade).toContain(".delete(posTerminals)");
    expect(cascade).toContain("eq(posTerminals.restaurantId, restaurantId)");
    expect(occupancy).not.toContain("orphan");
    expect(occupancy).not.toContain("deleteRestaurantCascade");
  });

  it("does not invent occupancy for orphan quantity keys", () => {
    const helper = read("server/subscription-runtime/commercialLimitOccupancy.ts");
    expect(helper).not.toContain('"staffAccounts"');
    expect(helper).not.toContain('"branches"');
    expect(helper).not.toContain('"devices"');
  });

  it("G-07 TiDB harness never falls back to Production DATABASE_URL", () => {
    const tidb = read("server/subscription-runtime/__tests__/occupancyTestTidb.ts");
    expect(tidb).toContain("G07_DATABASE_URL");
    expect(tidb).toContain("TIDB_TEST_DATABASE_URL");
    expect(tidb).not.toMatch(/createPool\(\s*process\.env\.DATABASE_URL/);
    expect(tidb).toContain("G07_EXPECTED_BRANCH");
    expect(tidb).toContain("mineuqr-stagIn");
    expect(tidb).toContain("REJECT_PRODUCTION");
  });
});
