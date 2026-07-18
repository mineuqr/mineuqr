import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getKpiDefinition } from "../kpiDictionary";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REPORTING-BUSINESS-DAY-BACKFILL-1 architecture guards", () => {
  it("Revenue formula unchanged", () => {
    const revenue = getKpiDefinition("revenue");
    expect(revenue.formula).toContain("grandTotal");
    expect(revenue.calculationVersion).toBe(1);
  });

  it("rebuild scans write-model orders — not findPage clamp", () => {
    const mat = read(
      "server/order/read/projections/materializers/OrderReadProjectionMaterializer.ts"
    );
    expect(mat).toContain("REPORTING-BUSINESS-DAY-BACKFILL-1");
    expect(mat).toContain("listOrderIdsForRestaurant");
    expect(mat).toContain("deleteAllForRestaurant");
    expect(mat).not.toMatch(
      /rebuildRollupsForRestaurant[\s\S]*ownerOrders\.findPage/
    );
  });

  it("dayKey still uses resolveBusinessDayKey", () => {
    const status = read(
      "server/order/read/projections/materializers/projectionStatus.ts"
    );
    expect(status).toContain("resolveBusinessDayKey");
    expect(status).not.toContain("slice(0, 10)");
  });

  it("exposes dedicated BD rollup backfill CLI + confirm gate", () => {
    const script = read("scripts/order-read-business-day-rollup-backfill-execute.ts");
    expect(script).toContain("ORDER_READ_BD_ROLLUP_BACKFILL_CONFIRM");
    expect(script).toContain("orderReadBusinessDayRollupBackfillService");
    const pkg = read("package.json");
    expect(pkg).toContain("db:order-read:bd-rollup-backfill");
  });

  it("backfill service is rollup-only (no syncOrderProjections)", () => {
    const svc = read(
      "server/order/read/infrastructure/backfill/OrderReadBusinessDayRollupBackfillService.ts"
    );
    expect(svc).toContain("rebuildRollupsForRestaurant");
    expect(svc).not.toContain("syncOrderProjections");
  });
});
