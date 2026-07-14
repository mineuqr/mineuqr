import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDERING-CLIENT-BROWSE-1 architecture guards", () => {
  it("Client Platform owns browse orchestration and catalog filter helpers", () => {
    const provider = read(
      "client/src/lib/ordering-client/browse/OrderingBrowseProvider.tsx"
    );
    const catalog = read("client/src/lib/ordering-client/browse/browseCatalog.ts");
    expect(provider).toContain("filterBrowseItems");
    expect(provider).toContain("resolveDefaultCategoryId");
    expect(provider).toContain("activeCategoryId");
    expect(provider).toContain("searchQuery");
    expect(provider).toContain("selectedItemId");
    expect(catalog).toContain("filterBrowseItems");
    expect(catalog).toContain("resolveBrowsePresentationStatus");
  });

  it("QR table host mounts OrderingBrowseProvider", () => {
    const host = read("client/src/lib/ordering-client/qr/QrOrderingClientHost.tsx");
    expect(host).toContain("OrderingBrowseProvider");
    expect(host).toContain("OrderingCartProvider");
    expect(host).not.toContain("activeCategoryId");
    expect(host).not.toContain("searchQuery");
  });

  it("MenuView does not own browse filter or category state", () => {
    const menuView = read("client/src/pages/MenuView.tsx");
    expect(menuView).toContain("useOrderingBrowse");
    expect(menuView).toContain("QrBrowseOnlyHost");
    expect(menuView).not.toContain("useState");
    expect(menuView).not.toContain("filterBrowseItems");
    expect(menuView).not.toMatch(/activeCategoryId,\s*setActiveCategoryId/);
    expect(menuView).not.toContain("trpc.ordering.getRuntimeBySlug");
  });

  it("TableOrderingShell stays channel shell only", () => {
    const shell = read("client/src/pages/TableOrderingShell.tsx");
    expect(shell).toContain("QrOrderingClientHost");
    expect(shell).not.toContain("OrderingBrowseProvider");
    expect(shell).not.toContain("activeCategoryId");
  });

  it("browse consumes runtime via OrderingClientProvider not parallel queries", () => {
    const provider = read(
      "client/src/lib/ordering-client/browse/OrderingBrowseProvider.tsx"
    );
    expect(provider).toContain("useOptionalOrderingClientRuntime");
    expect(provider).not.toContain("getRuntimeBySlug");
    expect(provider).not.toContain("trpc.");
  });
});
