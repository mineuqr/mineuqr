import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MenuOffersTabBar } from "../MenuOffersTabBar";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) =>
      ({
        "menu.tabMenu": "القائمة",
        "menu.tabOffers": "العروض",
        "menu.offersTabAria": "العروض، {count} عروض نشطة",
        "menu.browseTabs": "تصفح",
      })[key] ?? key,
    language: "ar",
    dir: "rtl",
  }),
}));

describe("MenuOffersTabBar", () => {
  it("renders nothing when not visible", () => {
    const html = renderToStaticMarkup(
      <MenuOffersTabBar
        visible={false}
        activeTab="menu"
        onTabChange={() => {}}
        accentColor="#14b8a6"
        textColor="#fff"
        offerCount={0}
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
        offerCount={4}
      />
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain("القائمة");
    expect(html).toContain("العروض");
    expect(html).toContain(">4<");
  });

  it("MENU-OFFERS-BADGE-1: shows badge count and accessible label for offers tab", () => {
    const html = renderToStaticMarkup(
      <MenuOffersTabBar
        visible
        activeTab="menu"
        onTabChange={() => {}}
        accentColor="#14b8a6"
        textColor="#fff"
        offerCount={1}
      />
    );
    expect(html).toContain('aria-label="العروض، 1 عروض نشطة"');
    expect(html).toContain(">1<");
  });
});
