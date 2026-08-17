/**
 * POS-READ-APIS-IMPLEMENTATION-1 — architecture boundary guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const READ_OWNED = [
  "server/pos/api/posReadRouter.ts",
  "server/pos/services/PosOrderReadService.ts",
  "server/pos/services/PosOrderSettlementReadService.ts",
  "server/pos/services/PosCatalogReadService.ts",
  "server/pos/services/requirePosReadContext.ts",
];

describe("POS read API architecture guards", () => {
  it("exposes only query procedures under pos.read", () => {
    const router = read("server/pos/api/posReadRouter.ts");
    expect(router).toContain("verifiedProcedure");
    expect(router).toContain(".query(");
    expect(router).not.toContain(".mutation(");
    expect(read("server/pos/api/posRouter.ts")).toContain("read: posReadRouter");
  });

  it("does not mutate Order, Check, Settlement, Occupancy, or Reporting", () => {
    for (const file of READ_OWNED) {
      const src = read(file);
      expect(src, file).not.toContain("IdentityPlaceOrder");
      expect(src, file).not.toContain("CheckService");
      expect(src, file).not.toContain("ensureCheckForOrder");
      expect(src, file).not.toContain("settleCheckPaid");
      expect(src, file).not.toContain("settleOrderPaid");
      expect(src, file).not.toContain("checkLimit");
      expect(src, file).not.toContain("withCommercialLimitOccupancy");
      expect(src, file).not.toContain("occupancyDelta");
      expect(src, file).not.toContain("SalesChannelAnalytics");
      expect(src, file).not.toContain("getBusinessMetricsSummary");
      expect(src, file).not.toMatch(/SUM\s*\(\s*grandTotal/i);
      expect(src, file).not.toContain("db.execute");
    }
  });

  it("delegates to canonical Order Read and Order Settlement read services", () => {
    const orders = read("server/pos/services/PosOrderReadService.ts");
    const settlement = read("server/pos/services/PosOrderSettlementReadService.ts");
    const catalog = read("server/pos/services/PosCatalogReadService.ts");
    expect(orders).toContain("OrderReadWorkspaceService");
    expect(orders).toContain("this.orders.listActive");
    expect(settlement).toContain("OrderSettlementReadService");
    expect(settlement).toContain("this.settlements.listByOrder");
    expect(catalog).toContain("getMenuItemsByRestaurant");
    expect(catalog).not.toContain("createMenuItem");
  });

  it("authorizes POS reads via terminal scope, not owner-only restaurant access", () => {
    const auth = read("server/pos/services/requirePosReadContext.ts");
    const router = read("server/pos/api/posReadRouter.ts");
    expect(auth).toContain("assertRestaurantPosScope");
    expect(auth).toContain("resolvePosTerminalAccess");
    expect(auth).toContain("decision.context");
    expect(router).not.toContain("assertRestaurantAccess");
    expect(router).not.toContain("getDb");
    expect(router).not.toContain("getMenuItemsByRestaurant");
  });

  it("does not leak menu image URLs or invent a POS catalog schema", () => {
    const dto = read("server/pos/read/posCatalogDto.ts");
    expect(dto).toContain("PosCatalogItemDto");
    expect(dto).not.toContain("imageUrl");
    expect(dto).not.toContain("toFixed");
  });
});
