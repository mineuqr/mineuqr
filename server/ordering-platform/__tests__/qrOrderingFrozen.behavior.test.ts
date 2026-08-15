/**
 * COMMERCIAL-FROZEN-ACCOUNT-STATE-1 — public QR does not serve the active menu.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({
  getRestaurantBySlug: vi.fn(),
  getCategoriesByRestaurant: vi.fn(),
  getMenuItemsByRestaurant: vi.fn(),
  getActiveOffersByRestaurant: vi.fn(),
  getHolidaysByRestaurant: vi.fn(),
}));

vi.mock("../../commercial/guestOrderingAuthority", () => ({
  resolveGuestOrderingAllowed: vi.fn(),
}));

vi.mock("../../subscription-runtime", () => ({
  resolveOwnerEntitlements: vi.fn(),
}));

import {
  getActiveOffersByRestaurant,
  getCategoriesByRestaurant,
  getHolidaysByRestaurant,
  getMenuItemsByRestaurant,
  getRestaurantBySlug,
} from "../../db";
import { resolveGuestOrderingAllowed } from "../../commercial/guestOrderingAuthority";
import { resolveOwnerEntitlements } from "../../subscription-runtime";
import { loadQrOrderingRuntimeSources } from "../loadQrOrderingRuntimeSources";

const NOW = new Date("2026-08-15T12:00:00.000Z");

const restaurant = {
  id: 44,
  userId: 9,
  slug: "cafe-qr",
  nameAr: "مقهى الاختبار",
  currencyCode: "SAR",
  isActive: true,
  workingHours: null,
  temporaryClosure: null,
  menuTemplate: "classic",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

function mockMenuSources() {
  vi.mocked(getRestaurantBySlug).mockResolvedValue(restaurant as never);
  vi.mocked(getCategoriesByRestaurant).mockResolvedValue([{ id: 1 }] as never);
  vi.mocked(getMenuItemsByRestaurant).mockResolvedValue([{ id: 10 }] as never);
  vi.mocked(getActiveOffersByRestaurant).mockResolvedValue([{ id: 3 }] as never);
  vi.mocked(getHolidaysByRestaurant).mockResolvedValue([] as never);
  vi.mocked(resolveGuestOrderingAllowed).mockResolvedValue({ canOrder: true });
}

describe("public QR frozen behavior", () => {
  beforeEach(() => {
    vi.mocked(getRestaurantBySlug).mockReset();
    vi.mocked(getCategoriesByRestaurant).mockReset();
    vi.mocked(getMenuItemsByRestaurant).mockReset();
    vi.mocked(getActiveOffersByRestaurant).mockReset();
    vi.mocked(getHolidaysByRestaurant).mockReset();
    vi.mocked(resolveGuestOrderingAllowed).mockReset();
    vi.mocked(resolveOwnerEntitlements).mockReset();
    mockMenuSources();
  });

  it("serves the active menu when the account is ACTIVE", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue({
      meta: { commercialAccountState: "ACTIVE" },
    } as never);

    const loaded = await loadQrOrderingRuntimeSources({
      slug: "cafe-qr",
      now: NOW,
    });

    expect(loaded.restaurantPresentation.slug).toBe("cafe-qr");
    expect(loaded.request.restaurant.slug).toBe("cafe-qr");
    expect(loaded.request.menu.products).toHaveLength(1);
    expect(loaded.request.availability.canBrowse).toBe(true);
    expect(loaded.request.featureFlags.commercial_frozen).toBe(false);
  });

  it("keeps the same QR identity and suspends the menu when FROZEN", async () => {
    vi.mocked(resolveOwnerEntitlements).mockResolvedValue({
      meta: { commercialAccountState: "FROZEN" },
    } as never);

    const loaded = await loadQrOrderingRuntimeSources({
      slug: "cafe-qr",
      now: NOW,
    });

    expect(loaded.restaurantPresentation.slug).toBe("cafe-qr");
    expect(loaded.request.restaurant.slug).toBe("cafe-qr");
    expect(loaded.request.restaurant.id).toBe(44);
    expect(loaded.request.menu.categories).toEqual([]);
    expect(loaded.request.menu.products).toEqual([]);
    expect(loaded.request.menu.offers).toEqual([]);
    expect(loaded.request.availability.canBrowse).toBe(false);
    expect(loaded.request.availability.canPlaceOrder).toBe(false);
    expect(loaded.request.availability.reasons).toContain("commercial_account_frozen");
    expect(loaded.request.featureFlags.commercial_frozen).toBe(true);
  });
});
