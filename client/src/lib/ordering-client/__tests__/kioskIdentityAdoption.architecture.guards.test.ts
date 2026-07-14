import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildKioskStationCheckoutIdentity,
  createKioskOrderingNavigator,
} from "../index";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("KIOSK-IDENTITY-ADOPTION-1 architecture guards", () => {
  it("kiosk checkout submits station identity — never table lookup or order.create", () => {
    const checkout = read("client/src/pages/kiosk/KioskCheckoutStage.tsx");
    expect(checkout).toContain("buildKioskStationCheckoutIdentity");
    expect(checkout).toContain("identity:");
    expect(checkout).not.toContain("table.getByNumber");
    expect(checkout).not.toContain("tableId");
    expect(checkout).not.toContain("trpc.order.create");
    expect(checkout).not.toContain("placeWithIdentity");
    expect(checkout).not.toContain("getByNumber");
  });

  it("kiosk shell drops table query preservation", () => {
    const shell = read("client/src/pages/kiosk/KioskShell.tsx");
    expect(shell).toContain('p.set("station", stationId)');
    expect(shell).not.toContain('p.set("table"');
    expect(shell).toContain("stationId={stationId}");
    expect(shell).not.toContain("tableNumber={tableNumber}");
  });

  it("station identity adapter builds counter + station Fulfilment Anchor", () => {
    const identity = buildKioskStationCheckoutIdentity("front-counter");
    expect(identity.serviceMode).toBe("counter");
    expect(identity.fulfilmentAnchor.anchorType).toBe("station");
    if (identity.fulfilmentAnchor.anchorType === "station") {
      expect(identity.fulfilmentAnchor.stationId).toBe("front-counter");
    }
  });

  it("kiosk navigator preserves station query without table", () => {
    const paths: string[] = [];
    const nav = createKioskOrderingNavigator({
      slug: "cafe",
      stage: "browse",
      querySuffix: "station=front&kiosk=dev-1",
      setLocation: (p) => paths.push(p),
    });
    nav.goToCheckout();
    nav.goToConfirmation("tok");
    expect(paths[0]).toBe("/kiosk/cafe/checkout?station=front&kiosk=dev-1");
    expect(paths[1]).toContain("token=tok");
    expect(paths.join("")).not.toContain("table=");
  });

  it("platform placeWithIdentity is channel-agnostic (no kiosk branch)", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("placeWithIdentity");
    expect(routers).toContain("identityPlaceOrderService");
    expect(routers).not.toMatch(
      /placeWithIdentity[\s\S]{0,400}ORDERING_CHANNEL_KIOSK/
    );
    expect(routers).not.toMatch(/placeWithIdentity[\s\S]{0,400}if \(.*kiosk/i);
  });

  it("QR CheckoutPage still uses table submit path", () => {
    const page = read("client/src/pages/CheckoutPage.tsx");
    expect(page).toContain("tableId: tableData.id");
    expect(page).toContain("tableNumber");
    expect(page).not.toContain("buildKioskStationCheckoutIdentity");
    expect(page).not.toContain("placeWithIdentity");
  });
});
