import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { describe, expect, it } from "vitest";
import { orderReadOrders } from "../../../../drizzle/schema";
import {
  cashierPosPaidOperationalVisibilitySql,
  isCashierPosOperationallyListed,
} from "../cashierPosOperationalVisibility";
import { operationalLifecycleFilter } from "../projections/materializers/projectionLifecycle";

function compileListActiveVisibilitySql() {
  const db = drizzle.mock();
  return db
    .select()
    .from(orderReadOrders)
    .where(
      and(
        eq(orderReadOrders.restaurantId, 720007),
        eq(orderReadOrders.lifecycleStage, operationalLifecycleFilter()),
        cashierPosPaidOperationalVisibilitySql()
      )
    )
    .orderBy(asc(orderReadOrders.createdAt))
    .limit(101)
    .toSQL();
}

describe("CASHIER-ORDER-VISIBILITY-AND-NOTIFICATION-1 operational listing", () => {
  it("lists non-cashier channels regardless of Check payment", () => {
    expect(
      isCashierPosOperationallyListed({
        orderingChannel: "table_session",
        paidCheck: false,
      })
    ).toBe(true);
    expect(
      isCashierPosOperationallyListed({
        orderingChannel: "kiosk",
        paidCheck: false,
      })
    ).toBe(true);
  });

  it("hides unpaid cashier_pos from operational lists until a Paid Check exists", () => {
    expect(
      isCashierPosOperationallyListed({
        orderingChannel: "cashier_pos",
        paidCheck: false,
      })
    ).toBe(false);
    expect(
      isCashierPosOperationallyListed({
        orderingChannel: "cashier_pos",
        paidCheck: false,
        productionCollectionFact: true,
      })
    ).toBe(true);
  });

  it("compiles membership and Check columns from Drizzle schema objects", () => {
    const { sql, params } = compileListActiveVisibilitySql();

    expect(sql).not.toMatch(/\bcheck_id\b/);
    expect(sql).not.toMatch(/\border_id\b/);
    expect(sql).not.toMatch(/\brestaurant_id\b/);
    expect(sql).toContain("`checkId`");
    expect(sql).toContain("`orderId`");
    expect(sql).toContain("`restaurantId`");
    expect(sql).toContain("`active`");
    expect(sql).toContain("`outcome`");
    expect(sql).toContain("`check_order_membership`");
    expect(sql).toContain("`payment_collection_facts`");
    expect(params).toContain("cashier_pos");
    expect(params).toContain("paid");
    expect(params).toContain("complimentary");
    expect(params).toContain("production");
  });
});
