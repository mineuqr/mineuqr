import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDERING-RUNTIME-MATERIALIZATION-1 client architecture guards", () => {
  it("QR forbids materializer and factory construction", () => {
    const contract = read("client/src/lib/ordering-platform/qrOrderingChannelContract.ts");
    expect(contract).toContain("OrderingRuntimeMaterializer");
    expect(contract).toContain("orderingRuntimeMaterializer");
    expect(contract).toContain("QR_FORBIDDEN_RUNTIME_CONSTRUCTION");
  });

  it("QR experience pages do not materialize or construct runtime", () => {
    const menuView = read("client/src/pages/MenuView.tsx");
    const checkout = read("client/src/pages/CheckoutPage.tsx");
    for (const src of [menuView, checkout]) {
      expect(src).not.toContain("OrderingRuntimeMaterializer");
      expect(src).not.toContain("OrderingRuntimeContextFactory");
      expect(src).not.toContain("orderingRuntimeMaterializer");
      expect(src).not.toContain("freezeOrderingRuntimeContext");
    }
  });

  it("client ordering-platform does not own materializer or factory", () => {
    const index = read("client/src/lib/ordering-platform/index.ts");
    expect(index).not.toContain("OrderingRuntimeMaterializer");
    expect(index).not.toContain("OrderingRuntimeContextFactory");
  });
});
