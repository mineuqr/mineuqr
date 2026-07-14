import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("QR-ORDERING-RUNTIME-MIGRATION-1 client architecture guards", () => {
  it("QR pages consume runtime via useQrOrderingRuntime (Client Platform entry)", () => {
    const menuView = read("client/src/pages/MenuView.tsx");
    const checkout = read("client/src/pages/CheckoutPage.tsx");
    const hook = read("client/src/hooks/useQrOrderingRuntime.ts");
    const platformRuntime = read(
      "client/src/lib/ordering-client/runtime/useOrderingRuntime.ts"
    );
    expect(platformRuntime).toContain("ordering.getRuntimeBySlug");
    expect(hook).toContain("useOrderingRuntime");
    expect(menuView).toContain("useQrOrderingRuntime");
    expect(checkout).toContain("useQrOrderingRuntime");
  });

  it("QR pages do not assemble hours or guest entitlement locally", () => {
    const menuView = read("client/src/pages/MenuView.tsx");
    const checkout = read("client/src/pages/CheckoutPage.tsx");
    for (const src of [menuView, checkout]) {
      expect(src).not.toContain("isRestaurantOpen");
      expect(src).not.toContain("parseTemporaryClosure");
      expect(src).not.toContain("restaurantHours");
      expect(src).not.toContain("order.canOrder");
      expect(src).not.toContain("OrderingRuntimeMaterializer");
      expect(src).not.toContain("OrderingRuntimeContextFactory");
    }
  });

  it("QR menu/checkout no longer fan-out restaurant list queries for runtime", () => {
    const menuView = read("client/src/pages/MenuView.tsx");
    expect(menuView).not.toContain("restaurant.getBySlug");
    expect(menuView).not.toContain("category.listPublic");
    expect(menuView).not.toContain("menuItem.listByRestaurant");
    expect(menuView).not.toContain("offer.listActive");
    expect(menuView).not.toContain("holiday.listPublic");
    const checkout = read("client/src/pages/CheckoutPage.tsx");
    expect(checkout).not.toContain("restaurant.getBySlug");
  });

  it("QR contract declares runtime consumption entry", () => {
    const contract = read("client/src/lib/ordering-platform/qrOrderingChannelContract.ts");
    expect(contract).toContain("QR_RUNTIME_CONSUMPTION_ENTRY");
    expect(contract).toContain("ordering.getRuntimeBySlug");
  });
});
