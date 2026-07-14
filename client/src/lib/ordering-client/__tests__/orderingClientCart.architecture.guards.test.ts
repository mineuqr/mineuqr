import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDERING-CLIENT-CART-1 architecture guards", () => {
  it("Client Platform owns cart orchestration and persistence", () => {
    const cartProvider = read(
      "client/src/lib/ordering-client/cart/OrderingCartProvider.tsx"
    );
    const persistence = read(
      "client/src/lib/ordering-client/cart/cartPersistence.ts"
    );
    expect(cartProvider).toContain("loadCartByScopeKey");
    expect(cartProvider).toContain("saveCartByScopeKey");
    expect(persistence).toContain("buildCartPersistenceKey");
    expect(persistence).toContain("ORDERING_CART_PERSISTENCE_NAMESPACE");
  });

  it("QR host supplies CartScopeAdapter and does not orchestrate persistence", () => {
    const host = read("client/src/lib/ordering-client/qr/QrOrderingClientHost.tsx");
    expect(host).toContain("createQrTableCartScopeAdapter");
    expect(host).toContain("OrderingCartProvider");
    expect(host).not.toContain("loadCartByScopeKey");
    expect(host).not.toContain("sessionStorage");
    expect(host).not.toContain('cartScope={{ slug');
  });

  it("legacy CartContext is a façade over Client Platform cart", () => {
    const facade = read("client/src/contexts/CartContext.tsx");
    expect(facade).toContain("OrderingCartProvider");
    expect(facade).toContain("useOrderingCart");
    expect(facade).not.toContain("useState");
    expect(facade).not.toContain("loadScopedCart");
  });

  it("QR adapter uses platform key builder not ad-hoc string concat", () => {
    const adapter = read(
      "client/src/lib/ordering-client/qr/createQrCartScopeAdapter.ts"
    );
    expect(adapter).toContain("buildCartPersistenceKey");
    expect(adapter).not.toContain("mineuqr:cart:");
  });

  it("TableOrderingShell does not own CartProvider", () => {
    const shell = read("client/src/pages/TableOrderingShell.tsx");
    expect(shell).toContain("QrOrderingClientHost");
    expect(shell).not.toContain("CartProvider");
    expect(shell).not.toContain("OrderingCartProvider");
  });
});
