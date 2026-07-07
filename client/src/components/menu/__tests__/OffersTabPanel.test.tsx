import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { OffersTabPanel } from "../OffersTabPanel";

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", t: (k: string) => k, dir: "ltr" }),
}));

vi.mock("@/components/AddToCartButton", () => ({
  default: () => null,
}));

const sampleOffer = {
  id: 1,
  titleAr: "عرض خاص",
  titleEn: "Special",
  descriptionAr: "وصف العرض",
  offerType: "daily",
  originalPrice: "100",
  offerPrice: "50",
  startDate: "2026-01-01T00:00:00.000Z",
  endDate: "2099-12-31T23:59:59.000Z",
  imageUrl: null,
  image: null,
};

describe("OffersTabPanel MENU-OFFERS-TAB-1", () => {
  it("renders compact offer card content", () => {
    const html = renderToStaticMarkup(
      <OffersTabPanel
        offers={[sampleOffer]}
        accentColor="#14b8a6"
        textColor="#ffffff"
        currencySymbol="SAR"
      />
    );
    expect(html).toContain("عرض خاص");
    expect(html).toContain("50");
    expect(html).toContain("100");
    expect(html).toContain("وصف العرض");
  });

  it("uses smaller image height class instead of full-width hero", () => {
    const html = renderToStaticMarkup(
      <OffersTabPanel
        offers={[{ ...sampleOffer, imageUrl: "https://cdn.example/offer.jpg" }]}
        accentColor="#14b8a6"
        textColor="#ffffff"
      />
    );
    expect(html).toContain("h-28");
    expect(html).not.toContain("aspect-[16/10]");
  });

  it("returns empty output when no offers", () => {
    const html = renderToStaticMarkup(
      <OffersTabPanel offers={[]} accentColor="#14b8a6" textColor="#fff" />
    );
    expect(html).toBe("");
  });
});
