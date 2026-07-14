import { describe, expect, it } from "vitest";
import {
  filterBrowseItems,
  resolveBrowseMenuTab,
  resolveBrowsePresentationStatus,
  resolveDefaultCategoryId,
} from "../browse/browseCatalog";

describe("ORDERING-CLIENT-BROWSE-1 catalog helpers", () => {
  const items = [
    {
      id: 1,
      categoryId: 10,
      nameAr: "شاورما",
      nameEn: "Shawarma",
      descriptionAr: "دجاج",
    },
    {
      id: 2,
      categoryId: 20,
      nameAr: "برجر",
      nameEn: "Burger",
      descriptionAr: "لحم",
    },
  ];

  it("filters by active category", () => {
    expect(filterBrowseItems(items, 10, "")).toHaveLength(1);
    expect(filterBrowseItems(items, 10, "")[0]?.id).toBe(1);
  });

  it("filters by search across ar/en/description", () => {
    expect(filterBrowseItems(items, null, "burg")).toHaveLength(1);
    expect(filterBrowseItems(items, null, "دجاج")).toHaveLength(1);
    expect(filterBrowseItems(items, null, "xyz")).toHaveLength(0);
  });

  it("applies category then search", () => {
    expect(filterBrowseItems(items, 10, "shawarma")).toHaveLength(1);
    expect(filterBrowseItems(items, 10, "burger")).toHaveLength(0);
  });

  it("defaults to first category when none selected", () => {
    expect(resolveDefaultCategoryId([{ id: 7 }, { id: 8 }], null)).toBe(7);
    expect(resolveDefaultCategoryId([{ id: 7 }], 8)).toBe(8);
    expect(resolveDefaultCategoryId([], null)).toBe(null);
  });

  it("falls back from offers tab when no offers", () => {
    expect(resolveBrowseMenuTab("offers", 0)).toBe("menu");
    expect(resolveBrowseMenuTab("offers", 2)).toBe("offers");
    expect(resolveBrowseMenuTab("menu", 0)).toBe("menu");
  });

  it("resolves loading / not_found / unavailable / ready presentation", () => {
    expect(
      resolveBrowsePresentationStatus({ isLoading: true, restaurant: null })
    ).toBe("loading");
    expect(
      resolveBrowsePresentationStatus({ isLoading: false, restaurant: null })
    ).toBe("not_found");
    expect(
      resolveBrowsePresentationStatus({
        isLoading: false,
        restaurant: { isActive: false },
      })
    ).toBe("unavailable");
    expect(
      resolveBrowsePresentationStatus({
        isLoading: false,
        restaurant: { isActive: true },
      })
    ).toBe("ready");
  });
});
