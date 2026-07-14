import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDERING-CLIENT-RUNTIME-1 architecture guards", () => {
  it("sole getRuntimeBySlug consumer is Client Platform runtime module", () => {
    const platformHook = read(
      "client/src/lib/ordering-client/runtime/useOrderingRuntime.ts"
    );
    const qrHook = read("client/src/hooks/useQrOrderingRuntime.ts");
    const menuView = read("client/src/pages/MenuView.tsx");
    const checkout = read("client/src/pages/CheckoutPage.tsx");

    expect(platformHook).toContain("ordering.getRuntimeBySlug");
    expect(qrHook).not.toMatch(/trpc\.ordering\.getRuntimeBySlug/);
    expect(menuView).not.toMatch(/trpc\.ordering\.getRuntimeBySlug/);
    expect(checkout).not.toMatch(/trpc\.ordering\.getRuntimeBySlug/);
    expect(qrHook).not.toContain("getRuntimeBySlug.useQuery");
  });

  it("QR table shell hosts Client Platform", () => {
    const shell = read("client/src/pages/TableOrderingShell.tsx");
    expect(shell).toContain("QrOrderingClientHost");
    expect(shell).not.toContain("CartProvider");
  });

  it("QR and Kiosk gate helpers delegate to shared Client Platform derivation", () => {
    const qr = read("client/src/lib/ordering-platform/qrOrderingRuntimeConsumer.ts");
    const kiosk = read(
      "client/src/lib/ordering-platform/kioskRuntimeConsumerContract.ts"
    );
    expect(qr).toContain("deriveOrderingRuntimeGates");
    expect(kiosk).toContain("deriveOrderingRuntimeGates");
    expect(qr).not.toContain("isOpenNow &&");
    expect(kiosk).not.toContain("isOpenNow &&");
  });

  it("composition contracts exist for adapters", () => {
    const cart = read("client/src/lib/ordering-client/contracts/CartScopeAdapter.ts");
    const nav = read("client/src/lib/ordering-client/contracts/OrderingNavigator.ts");
    expect(cart).toContain("CartScopeAdapter");
    expect(nav).toContain("OrderingNavigator");
    expect(nav).toContain("goToCheckout");
  });

  it("QR hook does not construct OrderingRuntimeContext", () => {
    const qrHook = read("client/src/hooks/useQrOrderingRuntime.ts");
    expect(qrHook).not.toContain("OrderingRuntimeMaterializer");
    expect(qrHook).not.toContain("OrderingRuntimeContextFactory");
  });
});
