import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("NON-TABLE-PLACE-ORDER-1 architecture guards", () => {
  it("PlaceOrderService uses identity persist dual-write", () => {
    const service = read("server/order/application/PlaceOrderService.ts");
    expect(service).toContain("resolvePlaceOrderPersistFields");
    expect(service).toContain("assertPlatformOrderIdentity");
    expect(service).toContain("tableId?");
  });

  it("IdentityPlaceOrderService is channel-agnostic and uses Operational Session", () => {
    const orch = read("server/order/application/IdentityPlaceOrderService.ts");
    expect(orch).toContain("resolveOperationalSession");
    expect(orch).toContain("sessionAnchorFromFulfilmentAnchor");
    expect(orch).not.toContain("KioskPlaceOrder");
    expect(orch).not.toContain("if (channel ===");
  });

  it("order.create remains table QR path; placeWithIdentity is identity entry", () => {
    const router = read("server/routers.ts");
    expect(router).toContain("createTableOrderIdentity");
    expect(router).toContain("getTableByRestaurantAndNumber");
    expect(router).toContain("placeWithIdentity");
    expect(router).toContain("identityPlaceOrderService");
  });

  it("legacy non-table sentinels are platform-owned (not restaurant_tables)", () => {
    const contract = read(
      "shared/ordering-platform/orderingIdentityContract.ts"
    );
    expect(contract).toContain("LEGACY_NON_TABLE_TABLE_ID");
    expect(contract).toContain("LEGACY_NON_TABLE_TABLE_NUMBER");
    expect(contract).toContain("Not a restaurant_tables row");
  });
});
