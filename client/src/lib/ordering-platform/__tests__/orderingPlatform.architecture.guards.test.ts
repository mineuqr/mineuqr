import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDERING-PLATFORM-ARCHITECTURE-1 client guards", () => {
  it("defines QR as an ordering channel client", () => {
    const contract = read("client/src/lib/ordering-platform/qrOrderingChannelContract.ts");
    expect(contract).toContain("ORDERING_CHANNEL_QR");
    expect(contract).toContain("QR_FORBIDDEN_PLATFORM_CONCERNS");
  });

  it("QR channel does not import operational runtime", () => {
    const menuView = read("client/src/pages/MenuView.tsx");
    const checkout = read("client/src/pages/CheckoutPage.tsx");
    expect(menuView).not.toContain("operational-screen");
    expect(checkout).not.toContain("operational-screen");
  });

  it("offer cart re-exports shared platform identity", () => {
    const offerCart = read("client/src/lib/offerCart.ts");
    expect(offerCart).toContain("@shared/ordering-platform/offerCartIdentity");
    expect(offerCart).not.toMatch(/OFFER_CART_MENU_ITEM_ID_BASE =/);
  });

  it("shared runtime contract is presentation-independent", () => {
    const runtime = read("shared/ordering-platform/orderingRuntimeContract.ts");
    expect(runtime).toContain("OrderingRuntimeContext");
    expect(runtime).not.toMatch(/\borientation\s*:/);
    expect(runtime).not.toMatch(/\bscreenWidth\s*:/);
    expect(runtime).not.toMatch(/\bformFactor\s*:/);
    expect(runtime).not.toMatch(/\bdeviceType\s*:/);
  });

  it("platform contracts separate channel and platform ownership", () => {
    const contracts = read("shared/ordering-platform/orderingPlatformContracts.ts");
    expect(contracts).toContain("ORDERING_PLATFORM_OWNED_CONCERNS");
    expect(contracts).toContain("ORDERING_CHANNEL_OWNED_CONCERNS");
    expect(contracts).toContain("ORDERING_FORM_FACTORS");
  });
});
