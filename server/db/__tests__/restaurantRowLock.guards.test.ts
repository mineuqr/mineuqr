/**
 * COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1 — ownership guards.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("restaurant cascade TOCTOU ownership guards", () => {
  it("locks the restaurant row before cascade child deletes", () => {
    const cascade = read("server/db/cascadeDeletes.ts");
    const lockAt = cascade.indexOf("lockRestaurantRowForUpdate(tx, restaurantId)");
    const itemsAt = cascade.indexOf(".delete(menuItems)");
    const catsAt = cascade.indexOf(".delete(categories)");
    const restaurantAt = cascade.lastIndexOf(".delete(restaurants)");
    expect(lockAt).toBeGreaterThan(0);
    expect(itemsAt).toBeGreaterThan(lockAt);
    expect(catsAt).toBeGreaterThan(lockAt);
    expect(restaurantAt).toBeGreaterThan(catsAt);
    expect(cascade).toContain('isolationLevel: "read committed"');
    expect(cascade).not.toContain("withCommercialLimitOccupancy");
    expect(cascade).not.toContain("GET_LOCK");
  });

  it("keeps restaurant lifecycle out of the Commercial occupancy primitive", () => {
    const occupancy = read("server/subscription-runtime/commercialLimitOccupancy.ts");
    expect(occupancy).not.toContain("lockRestaurantRowForUpdate");
    expect(occupancy).not.toContain("requireRestaurantRowForUpdate");
    expect(occupancy).not.toContain("RestaurantGoneError");
    expect(occupancy).not.toContain("FROM restaurants");
    expect(occupancy).not.toContain("deleteRestaurantCascade");
  });

  it("locks the parent inside occupancy COUNT for category, item, and POS", () => {
    const limits = read("server/subscriptionPlanLimits.ts");
    const pos = read("server/pos/services/PosTerminalService.ts");
    expect(limits).toContain("requireRestaurantRowForUpdate(tx, data.restaurantId)");
    expect(limits.split("requireRestaurantRowForUpdate(tx, data.restaurantId)").length).toBe(3);
    expect(pos).toContain("requireRestaurantRowForUpdate(tx, restaurantId)");
    expect(pos).not.toContain("GET_LOCK");
    expect(pos).not.toContain("PosLifecycleLock");
  });

  it("admin category/item inserts lock the parent restaurant", () => {
    const db = read("server/db.ts");
    expect(db).toContain("requireRestaurantRowForUpdate(tx, data.restaurantId)");
    expect(db).toContain("tx.insert(categories)");
    expect(db).toContain("tx.insert(menuItems)");
  });

  it("order create locks the parent restaurant in the same persist transaction", () => {
    const orders = read(
      "server/order/infrastructure/persistence/DrizzleOrderRepository.ts"
    );
    const lockAt = orders.indexOf("requireRestaurantRowForUpdate(tx, snapshot.restaurantId)");
    const insertAt = orders.indexOf("tx.insert(orders)");
    expect(lockAt).toBeGreaterThan(0);
    expect(insertAt).toBeGreaterThan(lockAt);
  });

  it("does not add an FK, 0095, POS lock, or occupancy counter", () => {
    const journal = read("drizzle/meta/_journal.json");
    const sql0094 = read("drizzle/0094_commercial_limit_occupancy_locks.sql");
    const terminals = read("drizzle/0091_pos_terminals.sql");
    expect(journal).not.toContain("0095");
    expect(sql0094).not.toContain("restaurants");
    expect(terminals).not.toMatch(/REFERENCES `restaurants`/);
    expect(read("server/db/restaurantRowLock.ts")).not.toContain("occupied");
    expect(read("server/db/restaurantRowLock.ts")).not.toContain("GET_LOCK");
  });
});
