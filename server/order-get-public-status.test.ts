import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  getOrderByTrackingToken: vi.fn(),
}));

import { appRouter } from "./routers";
import { getOrderByTrackingToken } from "./db";

describe("order.getPublicStatus PR-CUX-1B", () => {
  const caller = appRouter.createCaller({
    user: null,
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });

  it("returns customer-safe fields for a valid token", async () => {
    vi.mocked(getOrderByTrackingToken).mockResolvedValue({
      orderId: 99,
      orderNumber: "ORD-0003",
      tableNumber: 2,
      status: "preparing",
      totalAmount: "25.00",
      createdAt: "2026-06-12 10:00:00",
      nameAr: "مطعم",
      nameEn: "Restaurant",
      currencySymbol: "ر.س",
      tableLabel: "tables",
      itemCount: 2,
    });

    const result = await caller.order.getPublicStatus({
      trackingToken: "abc123token456789012",
      slug: "test-slug",
    });

    expect(getOrderByTrackingToken).toHaveBeenCalledWith(
      "abc123token456789012",
      "test-slug"
    );
    expect(result).toEqual({
      orderNumber: "ORD-0003",
      createdAt: "2026-06-12 10:00:00",
      tableNumber: 2,
      itemCount: 2,
      totalAmount: "25.00",
      status: "preparing",
      restaurantName: "مطعم",
      restaurantNameEn: "Restaurant",
      currencySymbol: "ر.س",
      tableLabel: "tables",
    });
    expect(result).not.toHaveProperty("orderId");
    expect(result).not.toHaveProperty("restaurantId");
  });

  it("returns null when token does not match slug (no enumeration)", async () => {
    vi.mocked(getOrderByTrackingToken).mockResolvedValue(null);

    const result = await caller.order.getPublicStatus({
      trackingToken: "missingtoken12345678",
      slug: "wrong-slug",
    });

    expect(result).toBeNull();
  });

  it("rejects invalid tracking token format", async () => {
    await expect(
      caller.order.getPublicStatus({
        trackingToken: "bad token!",
        slug: "test-slug",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
