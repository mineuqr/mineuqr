/**
 * COMMERCIAL-LIMIT-OCCUPANCY-DOMAIN-RACE-TESTS-1 — forensic guards.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("G-08 domain occupancy race forensic guards", () => {
  it("quantity-governed creates go through the occupancy helper", () => {
    const limits = read("server/subscriptionPlanLimits.ts");
    const router = read("server/routers.ts");
    const pos = read("server/pos/services/PosTerminalService.ts");
    expect(limits).toContain("createRestaurantWithCommercialLimit");
    expect(limits).toContain("createCategoryWithCommercialLimit");
    expect(limits).toContain("createMenuItemWithCommercialLimit");
    expect(limits).toContain("withCommercialLimitOccupancy");
    expect(limits).toContain('limitKey: "restaurants"');
    expect(limits).toContain('limitKey: "categories"');
    expect(limits).toContain('limitKey: "items"');
    expect(router).toContain("createRestaurantWithCommercialLimit");
    expect(pos).toContain("withCommercialLimitOccupancy");
    expect(pos).toContain("occupancyDelta");
    expect(pos).toContain("isProvisionedLifecycle");
  });

  it("does not split COUNT then later create on live owner/admin restaurant insert", () => {
    const router = read("server/routers.ts");
    const limits = read("server/subscriptionPlanLimits.ts");
    expect(router).not.toContain("await assertRestaurantCreateAllowed");
    expect(router).toContain("createRestaurantWithCommercialLimit");
    expect(limits.indexOf("countOccupancy")).toBeGreaterThan(0);
    expect(limits.indexOf("tx.insert(restaurants)")).toBeGreaterThan(
      limits.indexOf("countOccupancy")
    );
  });

  it("routes owner and admin category/item creates through the occupancy helper (G-09)", () => {
    const router = read("server/routers.ts");
    expect(router).toContain("return createCategoryWithCommercialLimit(input)");
    expect(router).toContain("return createMenuItemWithCommercialLimit(input)");
    expect(router).not.toContain("await createCategory(input)");
    expect(router).not.toContain("await createMenuItem(input)");
    expect(router).not.toMatch(
      /role !== "admin"[\s\S]{0,220}createCategoryWithCommercialLimit/
    );
    expect(router).not.toMatch(
      /role !== "admin"[\s\S]{0,220}createMenuItemWithCommercialLimit/
    );
    expect(router).toContain("createRestaurantWithCommercialLimit");
    expect(router).not.toMatch(
      /role !== "admin"[\s\S]{0,120}createRestaurantWithCommercialLimit/
    );
  });

  it("delete paths do not decrement a shadow occupancy counter", () => {
    const db = read("server/db.ts");
    const cascade = read("server/db/cascadeDeletes.ts");
    const occupancy = read("server/subscription-runtime/commercialLimitOccupancy.ts");
    const pos = read("server/pos/services/PosTerminalService.ts");
    expect(db).toContain("export async function deleteCategory");
    expect(db).toContain("export async function deleteMenuItem");
    expect(db).not.toMatch(/deleteCategory[\s\S]{0,400}commercial_limit_occupancy_locks/);
    expect(db).not.toMatch(/deleteMenuItem[\s\S]{0,400}occupied = occupied - 1/);
    expect(cascade).toContain(".delete(posTerminals)");
    expect(cascade).not.toContain("withCommercialLimitOccupancy");
    expect(occupancy).not.toContain("occupied = occupied - 1");
    expect(pos).toContain("updateLifecycle(terminal.id, \"deactivated\")");
    expect(pos).not.toMatch(
      /async deactivate[\s\S]{0,500}withCommercialLimitOccupancy/
    );
  });

  it("POS replace re-reads lifecycle under the occupancy lock", () => {
    const pos = read("server/pos/services/PosTerminalService.ts");
    expect(pos).toContain("lockedDelta !== occupancyDelta");
    expect(pos).toContain("lifecycle_conflict");
    expect(pos).not.toContain("performReplace(null)");
    expect(pos).not.toContain("PosOccupancyService");
    expect(pos).not.toContain("GET_LOCK");
  });

  it("onboarding keeps its own transaction and does not wrap the helper", () => {
    const register = read("server/auth-local/registerOwner.ts");
    expect(register).toContain("assertOnboardingFirstRestaurantPermitted");
    expect(register).not.toContain("withCommercialLimitOccupancy");
    const assertAt = register.indexOf("assertOnboardingFirstRestaurantPermitted");
    const txAt = register.indexOf("db.transaction");
    const insertAt = register.indexOf("tx.insert(restaurants)");
    expect(assertAt).toBeGreaterThan(0);
    expect(txAt).toBeGreaterThan(assertAt);
    expect(insertAt).toBeGreaterThan(txAt);
  });

  it("parent lookup for category/item/POS happens before occupancy; no FK to restaurants", () => {
    const limits = read("server/subscriptionPlanLimits.ts");
    const pos = read("server/pos/services/PosTerminalService.ts");
    const terminalsSql = read("drizzle/0091_pos_terminals.sql");
    const catLookup = limits.indexOf("getRestaurantById(data.restaurantId)");
    const catLock = limits.indexOf("withCommercialLimitOccupancy", catLookup);
    expect(catLookup).toBeGreaterThan(0);
    expect(catLock).toBeGreaterThan(catLookup);
    const posLookup = pos.indexOf("getRestaurantById(restaurantId)");
    const posLock = pos.indexOf("withCommercialLimitOccupancy", posLookup);
    expect(posLookup).toBeGreaterThan(0);
    expect(posLock).toBeGreaterThan(posLookup);
    expect(terminalsSql).not.toMatch(/REFERENCES `restaurants`/);
  });

  it("does not invent occupancy for staffAccounts, branches, or devices", () => {
    const helper = read("server/subscription-runtime/commercialLimitOccupancy.ts");
    const limits = read("server/subscriptionPlanLimits.ts");
    expect(helper).not.toContain('"staffAccounts"');
    expect(helper).not.toContain('"branches"');
    expect(helper).not.toContain('"devices"');
    expect(limits).not.toContain('limitKey: "staffAccounts"');
    expect(limits).not.toContain('limitKey: "branches"');
  });

  it("dead check-then-act asserts remain unused on live insert paths", () => {
    const router = read("server/routers.ts");
    const pos = read("server/pos/services/PosTerminalService.ts");
    expect(router).not.toContain("assertCategoryCreateAllowed");
    expect(router).not.toContain("assertMenuItemCreateAllowed");
    expect(pos).not.toContain("assertProvisioningAllowed");
  });

  it("G-08 TiDB harness never falls back to Production DATABASE_URL", () => {
    const tidb = read("server/subscription-runtime/__tests__/occupancyTestTidb.ts");
    const races = read(
      "server/subscription-runtime/__tests__/commercialLimitOccupancy.tidb.domainRaces.test.ts"
    );
    expect(tidb).toContain("G07_DATABASE_URL");
    expect(tidb).not.toMatch(/createPool\(\s*process\.env\.DATABASE_URL/);
    expect(races).toContain("startOccupancyTestTidb");
    expect(races).toContain("G08_EVIDENCE");
    expect(races).toContain("countRestaurants");
    expect(races).not.toContain("process.env.DATABASE_URL)");
  });
});
