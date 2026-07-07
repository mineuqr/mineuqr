import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MenuOffersTabBar } from "../MenuOffersTabBar";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) =>
      ({
        "menu.tabMenu": "القائمة",
        "menu.tabOffers": "العروض",
        "menu.browseTabs": "تصفح",
      })[key] ?? key,
    language: "ar",
    dir: "rtl",
  }),
}));

describe("MenuOffersTabBar MENU-OFFERS-TAB-1", () => {
  it("renders nothing when not visible", () => {
    const html = renderToStaticMarkup(
      <MenuOffersTabBar
        visible={false}
        activeTab="menu"
        onTabChange={() => {}}
        accentColor="#14b8a6"
        textColor="#fff"
      />
    );
    expect(html).toBe("");
  });

  it("renders tablist with menu and offers labels when visible", () => {
    const html = renderToStaticMarkup(
      <MenuOffersTabBar
        visible
        activeTab="menu"
        onTabChange={() => {}}
        accentColor="#14b8a6"
        textColor="#fff"
      />
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain("القائمة");
    expect(html).toContain("العروض");
  });
});
