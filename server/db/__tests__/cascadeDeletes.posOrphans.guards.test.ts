/**
 * COMMERCIAL-RESTAURANT-CASCADE-POS-ORPHAN-HARDENING-1
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("restaurant cascade POS orphan guards", () => {
  it("deletes POS terminals, grants, and sale idempotency inside the restaurant cascade tx", () => {
    const cascade = read("server/db/cascadeDeletes.ts");
    const terminalsAt = cascade.indexOf(".delete(posTerminals)");
    const grantsAt = cascade.indexOf(".delete(posPermissionGrants)");
    const saleAt = cascade.indexOf(".delete(posSaleIdempotency)");
    const restaurantAt = cascade.lastIndexOf(".delete(restaurants)");
    expect(cascade).toContain("lockRestaurantRowForUpdate(tx, restaurantId)");
    expect(saleAt).toBeGreaterThan(cascade.indexOf("lockRestaurantRowForUpdate(tx, restaurantId)"));
    expect(grantsAt).toBeGreaterThan(saleAt);
    expect(terminalsAt).toBeGreaterThan(grantsAt);
    expect(restaurantAt).toBeGreaterThan(terminalsAt);
    expect(cascade).toContain("eq(posTerminals.restaurantId, restaurantId)");
    expect(cascade).toContain("eq(posPermissionGrants.restaurantId, restaurantId)");
    expect(cascade).toContain("eq(posSaleIdempotency.restaurantId, restaurantId)");
  });

  it("does not invent a POS cleanup job, occupancy filter, or schema migration", () => {
    const cascade = read("server/db/cascadeDeletes.ts");
    expect(cascade).not.toContain("withCommercialLimitOccupancy");
    expect(cascade).not.toContain("GET_LOCK");
    expect(cascade).not.toContain("PosOrphan");
    expect(cascade).not.toContain("setInterval");
    expect(cascade).not.toContain("lifecycle !== \"replaced\"");
    const occupancy = read("server/subscription-runtime/commercialLimitOccupancy.ts");
    expect(occupancy).not.toContain("orphan");
    expect(occupancy).not.toContain("deleteRestaurantCascade");
    const journal = read("drizzle/meta/_journal.json");
    expect(journal).not.toContain("0095");
  });
});
