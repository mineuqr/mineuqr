/**
 * SELF-ORDERING-COUNTER-PICKUP-ARCHITECTURE-1 — Phase 2 architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SELF-ORDERING-COUNTER-PICKUP-ARCHITECTURE-1 Phase 2 guards", () => {
  it("kiosk customer journey is Place Order → Confirmation (no payment UI)", () => {
    const checkout = read("client/src/pages/kiosk/KioskCheckoutStage.tsx");
    const confirmation = read("client/src/pages/kiosk/KioskConfirmationStage.tsx");
    expect(checkout).toContain("SELF-ORDERING-COUNTER-PICKUP-ARCHITECTURE-1");
    expect(checkout).not.toContain("order.settlePaid");
    expect(checkout).not.toContain("getSettlementReceipt");
    expect(checkout).not.toMatch(/deferTrackingNavigation\s*:/);
    expect(confirmation).toContain("Your Order Has Been Received");
    expect(confirmation).toContain("Pickup Number");
    expect(confirmation).toContain("displayReference");
    expect(confirmation).not.toContain("Payment Successful");
    expect(confirmation).not.toContain("Settlement");
    expect(confirmation).not.toMatch(/\bPaid\b/);
  });

  it("successful place clears cart immediately (provider default path)", () => {
    const provider = read(
      "client/src/lib/ordering-client/checkout/OrderingCheckoutProvider.tsx"
    );
    expect(provider).toContain("cart.clearCart()");
    expect(provider).toContain("navigator.goToTracking");
    expect(provider).toContain("!request.deferTrackingNavigation");
  });

  it("settlement backend façade remains for cashier reuse", () => {
    const svc = read("server/order/application/SettleOrderPaidService.ts");
    const routers = read("server/routers.ts");
    expect(svc).toContain("settleCheckPaidByIdDetailed");
    expect(routers).toContain("settlePaid: publicProcedure");
  });
});
