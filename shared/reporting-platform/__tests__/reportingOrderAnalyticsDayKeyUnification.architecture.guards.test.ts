/**
 * REPORTING-ORDER-ANALYTICS-DAYKEY-UNIFICATION-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getKpiDefinition } from "../kpiDictionary";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REPORTING-ORDER-ANALYTICS-DAYKEY-UNIFICATION-1 architecture guards", () => {
  it("canonical helper exists and uses resolveBusinessDayKey(createdAt)", () => {
    const helper = read(
      "server/order/read/projections/materializers/orderAnalyticsDayKey.ts"
    );
    expect(helper).toContain("REPORTING-ORDER-ANALYTICS-DAYKEY-UNIFICATION-1");
    expect(helper).toContain("orderAnalyticsBusinessDayKey");
    expect(helper).toContain("resolveBusinessDayKey");
    expect(helper).toContain("orderCreatedAt");
    expect(helper).toMatch(
      /export function orderAnalyticsBusinessDayKey\(\s*orderCreatedAt: string/
    );
    // Function body must resolve only createdAt (prohibition comments may name servedAt)
    const bodyStart = helper.indexOf("export function orderAnalyticsBusinessDayKey");
    const body = helper.slice(bodyStart);
    expect(body).toContain("resolveBusinessDayKey(orderCreatedAt");
    expect(body).not.toMatch(/resolveBusinessDayKey\([^)]*servedAt/);
    expect(body).not.toMatch(/resolveBusinessDayKey\([^)]*occurredAt/);
  });

  it("adjustAnalytics uses orderAnalyticsBusinessDayKey — not envelope.occurredAt", () => {
    const materializer = read(
      "server/order/read/projections/materializers/OrderReadProjectionMaterializer.ts"
    );
    expect(materializer).toContain("orderAnalyticsBusinessDayKey");
    expect(materializer).toContain("ORDER-ANALYTICS-DAYKEY-UNIFICATION-1");

    // Isolate adjustAnalytics body
    const start = materializer.indexOf("async adjustAnalytics");
    const end = materializer.indexOf("async handleOrderLifecycleEvent");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = materializer.slice(start, end);
    expect(body).toContain("orderAnalyticsBusinessDayKey");
    expect(body).not.toContain("dayKeyFromTimestamp(envelope.occurredAt");
    expect(body).not.toContain("envelope.occurredAt");
  });

  it("rebuild uses orderAnalyticsBusinessDayKey for P-10", () => {
    const materializer = read(
      "server/order/read/projections/materializers/OrderReadProjectionMaterializer.ts"
    );
    const start = materializer.indexOf("async rebuildRollupsForRestaurant");
    expect(start).toBeGreaterThan(-1);
    const body = materializer.slice(start);
    expect(body).toContain("orderAnalyticsBusinessDayKey(order.createdAt");
  });

  it("does not change Revenue / Order Sales formulas", () => {
    const revenue = getKpiDefinition("revenue");
    expect(revenue.formula).toContain("grandTotal");
    expect(revenue.calculationVersion).toBe(1);

    const orderSales = getKpiDefinition("orderSales");
    expect(orderSales.formula).toContain("completedSales");
    expect(orderSales.sourceOfTruth).toContain("completedSales");
  });

  it("backfill still delegates to rebuildRollupsForRestaurant", () => {
    const backfill = read(
      "server/order/read/infrastructure/backfill/OrderReadBusinessDayRollupBackfillService.ts"
    );
    expect(backfill).toContain("rebuildRollupsForRestaurant");
  });
});
