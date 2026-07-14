import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ORDERING_CHANNEL_SHELL_OWNED_CONCERNS,
  ORDERING_CLIENT_DEPENDENCY_RULES,
  ORDERING_CLIENT_LAYER_STACK,
  ORDERING_CLIENT_PLATFORM_OWNED_CONCERNS,
  ORDERING_CLIENT_REQUIRED_ADAPTERS,
  createKioskDeviceCartScopeAdapter,
  createWaiterStationCartScopeAdapter,
  ORDERING_CLIENT_STAGES,
} from "../index";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function listFilesRecursive(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      listFilesRecursive(full, acc);
    } else if (/\.(ts|tsx)$/.test(name) && !name.includes(".test.")) {
      acc.push(full);
    }
  }
  return acc;
}

describe("ORDERING-CLIENT-GOVERNANCE-1 architecture guards", () => {
  it("documents the only supported layer stack", () => {
    expect([...ORDERING_CLIENT_LAYER_STACK]).toEqual([
      "channel_shell",
      "ordering_client_platform",
      "ordering_runtime",
      "ordering_platform",
    ]);
    expect(ORDERING_CLIENT_PLATFORM_OWNED_CONCERNS).toContain("cart_lifecycle");
    expect(ORDERING_CLIENT_PLATFORM_OWNED_CONCERNS).toContain("browse_lifecycle");
    expect(ORDERING_CLIENT_PLATFORM_OWNED_CONCERNS).toContain("checkout_lifecycle");
    expect(ORDERING_CLIENT_PLATFORM_OWNED_CONCERNS).toContain("runtime_consumption");
    expect(ORDERING_CHANNEL_SHELL_OWNED_CONCERNS).toContain("entry_bootstrap");
    expect(ORDERING_CLIENT_REQUIRED_ADAPTERS).toEqual([
      "CartScopeAdapter",
      "OrderingNavigator",
    ]);
    expect(ORDERING_CLIENT_DEPENDENCY_RULES.length).toBeGreaterThan(0);
  });

  it("Client Platform owns cart, browse, checkout, and runtime composition modules", () => {
    expect(
      read("client/src/lib/ordering-client/cart/OrderingCartProvider.tsx")
    ).toContain("OrderingCartProvider");
    expect(
      read("client/src/lib/ordering-client/browse/OrderingBrowseProvider.tsx")
    ).toContain("OrderingBrowseProvider");
    expect(
      read("client/src/lib/ordering-client/checkout/OrderingCheckoutProvider.tsx")
    ).toContain("OrderingCheckoutProvider");
    expect(
      read("client/src/lib/ordering-client/runtime/useOrderingRuntime.ts")
    ).toContain("ordering.getRuntimeBySlug");
    const host = read("client/src/lib/ordering-client/qr/QrOrderingClientHost.tsx");
    expect(host).toContain("OrderingBrowseProvider");
    expect(host).toContain("OrderingCartProvider");
    expect(host).toContain("OrderingCheckoutProvider");
    expect(host).toContain("OrderingClientProvider");
  });

  it("QR channel pages do not own runtime query, cart, browse, or checkout orchestration", () => {
    const channelPages = [
      "client/src/pages/MenuView.tsx",
      "client/src/pages/CheckoutPage.tsx",
      "client/src/pages/TableOrderingShell.tsx",
    ];
    for (const page of channelPages) {
      const src = read(page);
      expect(src).not.toMatch(/trpc\.ordering\.getRuntimeBySlug/);
      expect(src).not.toContain("getRuntimeBySlug.useQuery");
      expect(src).not.toContain("OrderingCartProvider");
      expect(src).not.toContain("OrderingBrowseProvider");
      expect(src).not.toContain("OrderingCheckoutProvider");
      expect(src).not.toContain("validateOrderNote");
      expect(src).not.toContain("validateItemNote");
      expect(src).not.toContain("PlaceOrderService");
      expect(src).not.toMatch(/from ["']@shared\/ordering-platform/);
    }
    expect(read("client/src/pages/MenuView.tsx")).toContain("useOrderingBrowse");
    expect(read("client/src/pages/CheckoutPage.tsx")).toContain(
      "useOrderingCheckout"
    );
    expect(read("client/src/pages/TableOrderingShell.tsx")).toContain(
      "QrOrderingClientHost"
    );
  });

  it("sole getRuntimeBySlug consumer remains Client Platform runtime module", () => {
    const clientRoot = join(repoRoot, "client/src");
    const offenders: string[] = [];
    const callSite =
      /trpc\.ordering\.getRuntimeBySlug|getRuntimeBySlug\.useQuery/;
    for (const file of listFilesRecursive(clientRoot)) {
      const rel = file
        .slice(repoRoot.length)
        .replace(/\\/g, "/")
        .replace(/^\//, "");
      if (rel.includes("ordering-client/runtime/useOrderingRuntime.ts")) continue;
      if (rel.includes("/__tests__/")) continue;
      const src = readFileSync(file, "utf8");
      if (callSite.test(src)) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("OrderingNavigator exposes full stage surface for QR/Kiosk/Waiter", () => {
    const nav = read(
      "client/src/lib/ordering-client/contracts/OrderingNavigator.ts"
    );
    expect([...ORDERING_CLIENT_STAGES]).toEqual([
      "browse",
      "cart",
      "checkout",
      "confirmation",
      "tracking",
    ]);
    expect(nav).toContain("goToBrowse");
    expect(nav).toContain("goToCart");
    expect(nav).toContain("goToCheckout");
    expect(nav).toContain("goToConfirmation");
    expect(nav).toContain("goToTracking");
    const qrNav = read(
      "client/src/lib/ordering-client/qr/createQrOrderingNavigator.ts"
    );
    expect(qrNav).toContain("goToCart");
    expect(qrNav).toContain("goToConfirmation");
  });

  it("CartScopeAdapter extension points support kiosk and waiter without breaking QR keys", () => {
    const contract = read(
      "client/src/lib/ordering-client/contracts/CartScopeAdapter.ts"
    );
    expect(contract).toContain("deviceSessionId");
    expect(contract).toContain("stationId");
    expect(contract).toContain("sessionId");

    const kiosk = createKioskDeviceCartScopeAdapter("cafe", "sess-1");
    expect(kiosk.resolveScopeKey()).toBe("mineuqr:cart:cafe:device:sess-1");
    expect(kiosk.channel).toBe("kiosk");

    const waiter = createWaiterStationCartScopeAdapter({
      slug: "cafe",
      stationId: "bar-1",
      tableNumber: 3,
      sessionId: "ds-9",
    });
    expect(waiter.resolveScopeKey()).toBe(
      "mineuqr:cart:cafe:station:bar-1:table:3:session:ds-9"
    );
    expect(waiter.channel).toBe("waiter_tablet");

    const qr = read(
      "client/src/lib/ordering-client/qr/createQrCartScopeAdapter.ts"
    );
    expect(qr).toContain("buildCartPersistenceKey");
  });

  it("channel pages do not import useOrderingRuntime directly", () => {
    for (const page of [
      "client/src/pages/MenuView.tsx",
      "client/src/pages/CheckoutPage.tsx",
      "client/src/pages/TableOrderingShell.tsx",
    ]) {
      const src = read(page);
      expect(src).not.toContain("useOrderingRuntime");
      expect(src).not.toMatch(/from ["']@\/hooks\/useQrOrderingRuntime/);
    }
  });
});
