import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("KIOSK-BROWSE-PRESENTATION-ADOPTION-1 architecture guards", () => {
  it("shared MenuBrowseArea owns browse item presentation primitives", () => {
    const area = read("client/src/components/menu/MenuBrowseArea.tsx");
    expect(area).toContain("MenuOffersTabBar");
    expect(area).toContain("OffersTabPanel");
    expect(area).toContain("MenuSearchAndCategories");
    expect(area).toContain("MenuItemsGrid");
    expect(area).toContain("canAddToCart");
  });

  it("MenuItemsGrid renders shared browse metadata fields", () => {
    const grid = read("client/src/components/menu/MenuItemsGrid.tsx");
    expect(grid).toContain("imageUrl");
    expect(grid).toContain("descriptionAr");
    expect(grid).toContain("calories");
    expect(grid).toContain("isAvailable");
    expect(grid).toContain("resolveImageUrl");
  });

  it("QR MenuTemplates consumes shared MenuBrowseArea (no local item card fork)", () => {
    const templates = read("client/src/components/MenuTemplates.tsx");
    expect(templates).toContain('from "@/components/menu/MenuBrowseArea"');
    expect(templates).toContain("<MenuBrowseArea");
    expect(templates).not.toContain("function SearchAndCategories");
    expect(templates).not.toContain("function ItemsGrid");
    expect(templates).not.toContain("function Grid(");
    expect(templates).not.toContain("function ListView");
    expect(templates).not.toContain("function MenuBrowseArea");
  });

  it("KioskBrowseStage adopts shared MenuBrowseArea without local item rows", () => {
    const browse = read("client/src/pages/kiosk/KioskBrowseStage.tsx");
    expect(browse).toContain("MenuBrowseArea");
    expect(browse).toContain("canAddToCart");
    expect(browse).toContain("useOrderingBrowse");
    expect(browse).not.toContain("AddToCartButton");
    expect(browse).not.toContain("filteredItems.map");
    expect(browse).not.toContain("getRuntimeBySlug");
  });
});
