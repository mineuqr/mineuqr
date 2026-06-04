import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { resolveAuthoritativeOrderLines } from "./orderPricing";

vi.mock("./db", () => ({
  getMenuItemById: vi.fn(),
}));

import { getMenuItemById } from "./db";

const restaurantId = 1;

function menuItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    categoryId: 1,
    restaurantId,
    nameAr: "حمص",
    nameEn: "Hummus",
    price: "25.50",
    isAvailable: true,
    descriptionAr: null,
    descriptionEn: null,
    imageUrl: null,
    sortOrder: 0,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    calories: null,
    ...overrides,
  };
}

describe("resolveAuthoritativeOrderLines", () => {
  beforeEach(() => {
    vi.mocked(getMenuItemById).mockReset();
  });

  it("uses database unit price and ignores client manipulation", async () => {
    vi.mocked(getMenuItemById).mockResolvedValue(menuItem({ price: "25.50" }));

    const { lines, totalAmount } = await resolveAuthoritativeOrderLines(restaurantId, [
      { menuItemId: 10, quantity: 2 },
    ]);

    expect(lines[0]?.price).toBe("25.50");
    expect(lines[0]?.lineTotal).toBe(51);
    expect(totalAmount).toBe("51.00");
    expect(lines[0]?.nameAr).toBe("حمص");
  });

  it("rejects missing menu item", async () => {
    vi.mocked(getMenuItemById).mockResolvedValue(undefined);

    await expect(
      resolveAuthoritativeOrderLines(restaurantId, [{ menuItemId: 99, quantity: 1 }])
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: "صنف غير موجود" });
  });

  it("rejects cross-restaurant menu item", async () => {
    vi.mocked(getMenuItemById).mockResolvedValue(menuItem({ restaurantId: 2 }));

    await expect(
      resolveAuthoritativeOrderLines(restaurantId, [{ menuItemId: 10, quantity: 1 }])
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: "صنف لا يتبع هذا المطعم" });
  });

  it("rejects unavailable menu item", async () => {
    vi.mocked(getMenuItemById).mockResolvedValue(menuItem({ isAvailable: false }));

    await expect(
      resolveAuthoritativeOrderLines(restaurantId, [{ menuItemId: 10, quantity: 1 }])
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "الصنف غير متاح للطلب حالياً",
    });
  });

  it("rejects duplicate menuItemId in one order", async () => {
    vi.mocked(getMenuItemById).mockResolvedValue(menuItem());

    await expect(
      resolveAuthoritativeOrderLines(restaurantId, [
        { menuItemId: 10, quantity: 1 },
        { menuItemId: 10, quantity: 2 },
      ])
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: "صنف مكرر في الطلب" });
  });

  it("sums multiple lines server-side", async () => {
    vi.mocked(getMenuItemById).mockImplementation(async (id: number) => {
      if (id === 10) return menuItem({ id: 10, price: "10.00" });
      if (id === 11) return menuItem({ id: 11, nameAr: "فتة", price: "5.50" });
      return undefined;
    });

    const { totalAmount } = await resolveAuthoritativeOrderLines(restaurantId, [
      { menuItemId: 10, quantity: 1 },
      { menuItemId: 11, quantity: 2 },
    ]);

    expect(totalAmount).toBe("21.00");
  });

  it("preserves per-line notes", async () => {
    vi.mocked(getMenuItemById).mockResolvedValue(menuItem());

    const { lines } = await resolveAuthoritativeOrderLines(restaurantId, [
      { menuItemId: 10, quantity: 1, notes: "بدون ملح" },
    ]);

    expect(lines[0]?.notes).toBe("بدون ملح");
  });
});
