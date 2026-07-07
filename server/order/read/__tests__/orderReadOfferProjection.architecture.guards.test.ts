import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDER-READ-OFFER-PROJECTION-1 architecture guards", () => {
  it("explicit projection type contract — MenuItem | Offer", () => {
    const contracts = read("server/order/read/domain/contracts/lineProjectionContracts.ts");
    expect(contracts).toContain('ORDER_LINE_PROJECTION_TYPE_MENU_ITEM = "MenuItem"');
    expect(contracts).toContain('ORDER_LINE_PROJECTION_TYPE_OFFER = "Offer"');
    expect(contracts).toContain("OFFER_ORDER_LINE_MENU_ITEM_ID = 0");
  });

  it("query contracts use discriminated union — no nullable category on offer lines", () => {
    const contracts = read("server/order/read/domain/contracts/queryContracts.ts");
    expect(contracts).toContain("MenuItemOrderLineItemDto");
    expect(contracts).toContain("OfferOrderLineItemDto");
    expect(contracts).toContain("isMenuItemOrderLine");
    expect(contracts).toContain("isOfferOrderLine");
  });

  it("offer projection builder never resolves menu categories", () => {
    const builder = read("server/order/read/projections/builders/OrderOfferProjectionBuilder.ts");
    expect(builder).not.toContain("CategoryResolution");
    expect(builder).not.toContain("categoryId");
    expect(builder).toContain("lineKind: \"offer\"");
  });

  it("category backfill excludes offer lines", () => {
    const store = read("server/order/read/infrastructure/backfill/DrizzleCategoryBackfillLineItemStore.ts");
    expect(store).toContain("menuItemId} > 0");
    const service = read("server/order/read/infrastructure/backfill/OrderReadCategoryBackfillService.ts");
    expect(service).toContain("isOfferOrderLineMenuItemId");
  });

  it("read stores map persisted rows through canonical line mapper", () => {
    const kitchen = read("server/kitchen/read/infrastructure/OrderReadQueryAdapter.ts");
    expect(kitchen).toContain("mapStoredOrderReadLineItem");
    const operational = read("server/order/read/infrastructure/DrizzleOrderOperationalReadStore.ts");
    expect(operational).toContain("mapStoredOrderReadLineItem");
  });

  it("kitchen runtime skips offer lines for category collection", () => {
    const readModel = read("client/src/lib/operational-screen/kitchen/kitchenRuntimeReadModel.ts");
    expect(readModel).toContain("isMenuItemKitchenLine");
  });
});
