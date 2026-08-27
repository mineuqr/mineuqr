import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { describe, expect, it } from "vitest";
import { orderReadOrders } from "../../../../drizzle/schema";
import {
  cashierPosPaidOperationalVisibilitySql,
  diningOperationalExcludeCashierPosSql,
  isCashierPosOperationallyListed,
  isDiningOperationallyListed,
} from "../cashierPosOperationalVisibility";
import { operationalLifecycleFilter } from "../projections/materializers/projectionLifecycle";

function compileListActiveSql(
  membership: ReturnType<
    | typeof cashierPosPaidOperationalVisibilitySql
    | typeof diningOperationalExcludeCashierPosSql
  >
) {
  const db = drizzle.mock();
  return db
    .select()
    .from(orderReadOrders)
    .where(
      and(
        eq(orderReadOrders.restaurantId, 720007),
        eq(orderReadOrders.lifecycleStage, operationalLifecycleFilter()),
        membership
      )
    )
    .orderBy(asc(orderReadOrders.createdAt))
    .limit(101)
    .toSQL();
}

function compileListActiveVisibilitySql() {
  return compileListActiveSql(cashierPosPaidOperationalVisibilitySql());
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

  it("excludes cashier_pos from Dining operational membership even when paid", () => {
    expect(isDiningOperationallyListed("cashier_pos")).toBe(false);
    expect(isDiningOperationallyListed("qr")).toBe(true);
    expect(isDiningOperationallyListed("waiter_tablet")).toBe(true);
    expect(isDiningOperationallyListed("kiosk")).toBe(true);
    expect(isDiningOperationallyListed(null)).toBe(true);
    const { sql, params } = compileListActiveSql(
      diningOperationalExcludeCashierPosSql()
    );
    expect(params).toContain("cashier_pos");
    expect(sql).not.toContain("`check_order_membership`");
    expect(sql).not.toContain("`payment_collection_facts`");
  });

  it("Orders/Kitchen paid-visible membership includes cashier_pos via Check or production CF", () => {
    expect(
      isCashierPosOperationallyListed({
        orderingChannel: "cashier_pos",
        paidCheck: true,
      })
    ).toBe(true);
    const dining = compileListActiveSql(diningOperationalExcludeCashierPosSql());
    const paidVisible = compileListActiveVisibilitySql();
    expect(dining.sql).not.toContain("`payment_collection_facts`");
    expect(paidVisible.sql).toContain("`payment_collection_facts`");
    expect(paidVisible.sql).toContain("`check_order_membership`");
    expect(paidVisible.sql).not.toContain("'preparing'");
    expect(paidVisible.sql).not.toContain("'pending'");
    expect(paidVisible.sql).not.toContain("'ready'");
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
