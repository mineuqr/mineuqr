import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createKioskCartScopeAdapter,
  createKioskOrderingNavigator,
  kioskIsolationRulesOnReset,
} from "../index";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SELF-ORDERING-KIOSK-PLATFORM-1 architecture guards", () => {
  it("KioskOrderingClientHost composes Client Platform providers without duplication", () => {
    const host = read(
      "client/src/lib/ordering-client/kiosk/KioskOrderingClientHost.tsx"
    );
    expect(host).toContain("OrderingClientProvider");
    expect(host).toContain("OrderingBrowseProvider");
    expect(host).toContain("OrderingCartProvider");
    expect(host).toContain("OrderingCheckoutProvider");
    expect(host).toContain("createKioskCartScopeAdapter");
    expect(host).toContain("createKioskOrderingNavigator");
    expect(host).not.toContain("getRuntimeBySlug");
    expect(host).not.toContain("order.create");
    expect(host).not.toContain("validateOrderNote");
  });

  it("kiosk shell does not own cart/browse/checkout orchestration or platform rules", () => {
    const shell = read("client/src/pages/kiosk/KioskShell.tsx");
    expect(shell).toContain("KioskOrderingClientHost");
    expect(shell).not.toContain("OrderingBrowseProvider");
    expect(shell).not.toContain("OrderingCartProvider");
    expect(shell).not.toContain("OrderingCheckoutProvider");
    expect(shell).not.toContain("validateOrderNote");
    expect(shell).not.toContain("trpc.order.create");
    expect(shell).not.toContain("PlaceOrderService");
    expect(shell).not.toContain("getRuntimeBySlug");
  });

  it("kiosk stages consume Client Platform hooks only", () => {
    const browse = read("client/src/pages/kiosk/KioskBrowseStage.tsx");
    const cart = read("client/src/pages/kiosk/KioskCartStage.tsx");
    const checkout = read("client/src/pages/kiosk/KioskCheckoutStage.tsx");
    expect(browse).toContain("useOrderingBrowse");
    expect(cart).toContain("useOrderingCart");
    expect(checkout).toContain("useOrderingCheckout");
    for (const src of [browse, cart, checkout]) {
      expect(src).not.toContain("getRuntimeBySlug");
      expect(src).not.toContain("validateOrderNote");
      expect(src).not.toContain("PlaceOrderService");
    }
    expect(checkout).not.toContain("trpc.order.create");
  });

  it("kiosk cart scope includes station + device session via platform key builder", () => {
    const adapter = createKioskCartScopeAdapter({
      slug: "cafe",
      stationId: "front",
      deviceSessionId: "sess-a",
      kioskId: "dev-1",
    });
    expect(adapter.channel).toBe("kiosk");
    expect(adapter.resolveScopeKey()).toBe(
      "mineuqr:cart:cafe:station:front:device:sess-a:dev-1"
    );
    expect(adapter.description.stationId).toBe("front");
    expect(adapter.description.deviceSessionId).toBe("sess-a");
  });

  it("kiosk navigator maps platform stages and shell idle/language/reset", () => {
    const paths: string[] = [];
    const nav = createKioskOrderingNavigator({
      slug: "cafe",
      stage: "browse",
      querySuffix: "station=front&kiosk=dev-1",
      setLocation: (p) => paths.push(p),
    });
    nav.goToCart();
    nav.goToCheckout();
    nav.goToConfirmation("tok");
    nav.goToIdle();
    expect(paths).toEqual([
      "/kiosk/cafe/cart?station=front&kiosk=dev-1",
      "/kiosk/cafe/checkout?station=front&kiosk=dev-1",
      "/kiosk/cafe/confirmed?station=front&kiosk=dev-1&token=tok",
      "/kiosk/cafe?station=front&kiosk=dev-1",
    ]);
    expect(kioskIsolationRulesOnReset()).toContain("clear_cart");
  });

  it("QR host remains unaffected by kiosk channel", () => {
    const qrHost = read("client/src/lib/ordering-client/qr/QrOrderingClientHost.tsx");
    expect(qrHost).toContain("ORDERING_CHANNEL_QR");
    expect(qrHost).not.toContain("ORDERING_CHANNEL_KIOSK");
    expect(qrHost).not.toContain("createKioskCartScopeAdapter");
  });
});
