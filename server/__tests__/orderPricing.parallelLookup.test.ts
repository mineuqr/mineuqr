import { beforeEach, describe, expect, it, vi } from "vitest";

const LOOKUP_MS = 40;

vi.mock("../db", () => ({
  getMenuItemById: vi.fn(),
  getOfferById: vi.fn(),
}));

import { getMenuItemById } from "../db";
import { resolveAuthoritativeOrderLines } from "../orderPricing";

function menuItem(id: number) {
  return {
    id,
    restaurantId: 1,
    nameAr: `صنف ${id}`,
    nameEn: `Item ${id}`,
    price: "10.00",
    isAvailable: true,
  };
}

describe("authoritative order line lookups", () => {
  beforeEach(() => {
    vi.mocked(getMenuItemById).mockImplementation(async (id: number) => {
      await new Promise((resolve) => setTimeout(resolve, LOOKUP_MS));
      return menuItem(id) as never;
    });
  });

  it("loads multiple menu items concurrently", async () => {
    const started = Date.now();
    const result = await resolveAuthoritativeOrderLines(1, [
      { menuItemId: 1, quantity: 1 },
      { menuItemId: 2, quantity: 1 },
      { menuItemId: 3, quantity: 1 },
    ]);
    const elapsed = Date.now() - started;
    expect(result.lines).toHaveLength(3);
    expect(elapsed).toBeLessThan(LOOKUP_MS * 2);
    expect(getMenuItemById).toHaveBeenCalledTimes(3);
  });
});
