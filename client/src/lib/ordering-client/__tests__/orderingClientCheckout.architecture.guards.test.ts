import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDERING-CLIENT-CHECKOUT-1 architecture guards", () => {
  it("Client Platform owns checkout orchestration and note validation helpers", () => {
    const provider = read(
      "client/src/lib/ordering-client/checkout/OrderingCheckoutProvider.tsx"
    );
    const helpers = read(
      "client/src/lib/ordering-client/checkout/checkoutSubmission.ts"
    );
    expect(provider).toContain("order.create");
    expect(provider).toContain("placeWithIdentity");
    expect(provider).toContain("validateCheckoutNotes");
    expect(provider).toContain("submissionStatus");
    expect(provider).toContain("goToTracking");
    expect(helpers).toContain("validateOrderNote");
    expect(helpers).toContain("validateItemNote");
    expect(helpers).toContain("mapCheckoutSubmitError");
  });

  it("QR host mounts OrderingCheckoutProvider", () => {
    const host = read("client/src/lib/ordering-client/qr/QrOrderingClientHost.tsx");
    expect(host).toContain("OrderingCheckoutProvider");
    expect(host).toContain("OrderingCartProvider");
    expect(host).not.toContain("order.create");
    expect(host).not.toContain("customerName");
  });

  it("CheckoutPage is a QR shell without checkout orchestration state", () => {
    const page = read("client/src/pages/CheckoutPage.tsx");
    expect(page).toContain("useOrderingCheckout");
    expect(page).toContain("useOrderingClientRuntime");
    expect(page).not.toContain("useState");
    expect(page).not.toContain("validateOrderNote");
    expect(page).not.toContain("validateItemNote");
    expect(page).not.toContain("order.create");
    expect(page).not.toContain("trpc.order.create");
    expect(page).toContain("saveDiningSession");
    expect(page).toContain("markCustomerJourneyTracking");
  });

  it("TableOrderingShell does not own checkout provider", () => {
    const shell = read("client/src/pages/TableOrderingShell.tsx");
    expect(shell).toContain("QrOrderingClientHost");
    expect(shell).not.toContain("OrderingCheckoutProvider");
    expect(shell).not.toContain("order.create");
  });

  it("checkout uses table + identity client entries and shared notes contracts only", () => {
    const provider = read(
      "client/src/lib/ordering-client/checkout/OrderingCheckoutProvider.tsx"
    );
    const helpers = read(
      "client/src/lib/ordering-client/checkout/checkoutSubmission.ts"
    );
    expect(provider).toContain("trpc.order.create");
    expect(provider).toContain("trpc.order.placeWithIdentity");
    expect(provider).not.toMatch(/from ["'].*PlaceOrder/);
    expect(provider).not.toContain("ORDERING_CHANNEL_KIOSK");
    expect(helpers).toContain("@shared/ordering-platform/orderingNotesContract");
  });
});
