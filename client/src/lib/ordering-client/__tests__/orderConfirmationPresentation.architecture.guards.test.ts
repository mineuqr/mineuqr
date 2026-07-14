import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDER-CONFIRMATION-PRESENTATION-ADOPTION-1 architecture guards", () => {
  it("kiosk confirmation renders displayReference and never shows tracking token labels", () => {
    const stage = read("client/src/pages/kiosk/KioskConfirmationStage.tsx");
    expect(stage).toContain("loadConfirmationDisplayIdentity");
    expect(stage).toContain("displayReference");
    expect(stage).not.toContain("Tracking:");
    expect(stage).not.toContain("رمز التتبع");
  });

  it("QR order status presents displayReference as the customer order number", () => {
    const page = read("client/src/pages/OrderStatusPage.tsx");
    const hero = read("client/src/components/customer/OrderReceivedHero.tsx");
    expect(page).toContain("displayReference");
    expect(hero).toContain("displayReference");
    expect(hero).not.toContain("orderNumber");
  });

  it("checkout handoff persists server displayReference for confirmation", () => {
    const provider = read(
      "client/src/lib/ordering-client/checkout/OrderingCheckoutProvider.tsx"
    );
    const storage = read("client/src/lib/orderConfirmationStorage.ts");
    expect(provider).toContain("saveConfirmationDisplayIdentity");
    expect(provider).toContain("displayReference");
    expect(storage).toContain("saveConfirmationDisplayIdentity");
    expect(storage).toContain("displayReference");
  });

  it("public status and place APIs expose displayReference from server resolution", () => {
    const publicStatus = read("server/orderPublicStatus.ts");
    const place = read("server/order/application/PlaceOrderService.ts");
    const routers = read("server/routers.ts");
    expect(publicStatus).toContain("resolveOrderDisplayIdentity");
    expect(publicStatus).toContain("displayReference");
    expect(place).toContain("resolveOrderDisplayIdentity");
    expect(place).toContain("displayReference");
    expect(routers).toContain("displayReference: placeResult.displayReference");
  });
});
