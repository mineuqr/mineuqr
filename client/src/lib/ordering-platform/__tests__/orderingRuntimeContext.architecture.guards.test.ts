import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDERING-RUNTIME-CONTEXT-1 client architecture guards", () => {
  it("QR forbids runtime construction symbols", () => {
    const contract = read("client/src/lib/ordering-platform/qrOrderingChannelContract.ts");
    expect(contract).toContain("QR_FORBIDDEN_RUNTIME_CONSTRUCTION");
    expect(contract).toContain("OrderingRuntimeContextFactory");
  });

  it("QR experience pages do not construct OrderingRuntimeContext", () => {
    const menuView = read("client/src/pages/MenuView.tsx");
    const checkout = read("client/src/pages/CheckoutPage.tsx");
    for (const src of [menuView, checkout]) {
      expect(src).not.toContain("OrderingRuntimeContextFactory");
      expect(src).not.toContain("freezeOrderingRuntimeContext");
      expect(src).not.toContain("createOrderingRuntimeContext");
      expect(src).not.toContain("orderingRuntimeContextFactory");
    }
  });

  it("client ordering-platform does not own a runtime factory", () => {
    const index = read("client/src/lib/ordering-platform/index.ts");
    const contract = read("client/src/lib/ordering-platform/qrOrderingChannelContract.ts");
    expect(index).not.toContain("OrderingRuntimeContextFactory");
    expect(contract).not.toContain("class OrderingRuntimeContextFactory");
    expect(index).not.toContain("freezeOrderingRuntimeContext");
  });
});
