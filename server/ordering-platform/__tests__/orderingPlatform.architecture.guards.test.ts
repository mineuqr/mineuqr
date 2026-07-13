import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDERING-PLATFORM-ARCHITECTURE-1 server guards", () => {
  it("defines platform ownership registry", () => {
    const ownership = read("server/ordering-platform/orderingPlatformOwnership.ts");
    expect(ownership).toContain("ORDERING_PLATFORM_PLACE_ORDER_SERVICE");
    expect(ownership).toContain("PlaceOrderService");
    expect(ownership).toContain("ORDERING_PLATFORM_ACTIVE_CHANNELS");
  });

  it("PlaceOrderService remains the sole order mutation authority", () => {
    const composition = read("server/order/placeOrderComposition.ts");
    const aggregate = read("server/order/domain/aggregate/Order.ts");
    expect(composition).toContain("PlaceOrderService");
    expect(aggregate).toContain("placeNew");
  });

  it("order.create routes through placeOrderService not direct db.createOrder", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("placeOrderService.execute");
    expect(routers).not.toMatch(/order\.create[\s\S]{0,800}db\.createOrder/);
  });

  it("pricing authority uses shared offer cart identity", () => {
    const pricing = read("server/orderPricing.ts");
    expect(pricing).toContain("@shared/ordering-platform/offerCartIdentity");
    expect(pricing).not.toContain("OFFER_CART_MENU_ITEM_ID_BASE =");
  });

  it("offer cart base is not duplicated in server pricing", () => {
    const shared = read("shared/ordering-platform/offerCartIdentity.ts");
    const pricing = read("server/orderPricing.ts");
    expect(shared).toContain("OFFER_CART_MENU_ITEM_ID_BASE");
    expect(pricing).not.toMatch(/const OFFER_CART_MENU_ITEM_ID_BASE/);
  });
});
