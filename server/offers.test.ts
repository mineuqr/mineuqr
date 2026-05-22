import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db functions
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getRestaurantById: vi.fn(),
    getOffersByRestaurant: vi.fn(),
    getActiveOffersByRestaurant: vi.fn(),
    getOfferById: vi.fn(),
    createOffer: vi.fn(),
    updateOffer: vi.fn(),
    deleteOffer: vi.fn(),
  };
});

import {
  getRestaurantById,
  getOffersByRestaurant,
  getActiveOffersByRestaurant,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
} from "./db";

const mockGetRestaurantById = getRestaurantById as ReturnType<typeof vi.fn>;
const mockGetOffersByRestaurant = getOffersByRestaurant as ReturnType<typeof vi.fn>;
const mockGetActiveOffersByRestaurant = getActiveOffersByRestaurant as ReturnType<typeof vi.fn>;
const mockGetOfferById = getOfferById as ReturnType<typeof vi.fn>;
const mockCreateOffer = createOffer as ReturnType<typeof vi.fn>;
const mockUpdateOffer = updateOffer as ReturnType<typeof vi.fn>;
const mockDeleteOffer = deleteOffer as ReturnType<typeof vi.fn>;

function createAuthContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const mockRestaurant = {
  id: 1,
  userId: 1,
  nameAr: "مطعم تجريبي",
  nameEn: "Test Restaurant",
  slug: "test-restaurant",
};

const mockOffer = {
  id: 1,
  restaurantId: 1,
  titleAr: "عرض اليوم",
  titleEn: "Today's Offer",
  descriptionAr: "خصم 50%",
  descriptionEn: "50% off",
  offerType: "daily",
  originalPrice: "50",
  offerPrice: "25",
  imageUrl: null,
  startDate: new Date("2026-04-01"),
  endDate: new Date("2026-04-30"),
  isActive: true,
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("offer.list", () => {
  it("returns offers for restaurant owned by user", async () => {
    mockGetRestaurantById.mockResolvedValue(mockRestaurant);
    mockGetOffersByRestaurant.mockResolvedValue([mockOffer]);

    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.offer.list({ restaurantId: 1 });

    expect(result).toHaveLength(1);
    expect(result[0].titleAr).toBe("عرض اليوم");
  });

  it("returns empty array if restaurant not owned by user", async () => {
    mockGetRestaurantById.mockResolvedValue({ ...mockRestaurant, userId: 999 });

    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.offer.list({ restaurantId: 1 });

    expect(result).toEqual([]);
  });

  it("returns empty array if restaurant not found", async () => {
    mockGetRestaurantById.mockResolvedValue(null);

    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.offer.list({ restaurantId: 999 });

    expect(result).toEqual([]);
  });
});

describe("offer.listActive", () => {
  it("returns active offers for any user (public)", async () => {
    mockGetActiveOffersByRestaurant.mockResolvedValue([mockOffer]);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.offer.listActive({ restaurantId: 1 });

    expect(result).toHaveLength(1);
    expect(result[0].isActive).toBe(true);
  });

  it("returns empty array when no active offers", async () => {
    mockGetActiveOffersByRestaurant.mockResolvedValue([]);

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.offer.listActive({ restaurantId: 1 });

    expect(result).toEqual([]);
  });
});

describe("offer.create", () => {
  it("creates an offer for owned restaurant", async () => {
    mockGetRestaurantById.mockResolvedValue(mockRestaurant);
    mockCreateOffer.mockResolvedValue({ id: 2, ...mockOffer });

    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.offer.create({
      restaurantId: 1,
      titleAr: "عرض جديد",
      titleEn: "New Offer",
      descriptionAr: "وصف العرض",
      offerType: "weekly",
      originalPrice: "100",
      offerPrice: "60",
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    });

    expect(mockCreateOffer).toHaveBeenCalledTimes(1);
    expect(mockCreateOffer).toHaveBeenCalledWith(expect.objectContaining({
      titleAr: "عرض جديد",
      offerType: "weekly",
      startDate: expect.any(String),
      endDate: expect.any(String),
    }));
  });

  it("throws error if restaurant not owned by user", async () => {
    mockGetRestaurantById.mockResolvedValue({ ...mockRestaurant, userId: 999 });

    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(caller.offer.create({
      restaurantId: 1,
      titleAr: "عرض",
      offerType: "daily",
      originalPrice: "50",
      offerPrice: "25",
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    })).rejects.toThrow();
  });
});

describe("offer.update", () => {
  it("updates an offer owned by user", async () => {
    mockGetOfferById.mockResolvedValue(mockOffer);
    mockGetRestaurantById.mockResolvedValue(mockRestaurant);
    mockUpdateOffer.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.offer.update({
      id: 1,
      titleAr: "عرض محدث",
      isActive: false,
    });

    expect(result).toEqual({ success: true });
    expect(mockUpdateOffer).toHaveBeenCalledTimes(1);
  });

  it("throws error if offer not found", async () => {
    mockGetOfferById.mockResolvedValue(null);

    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(caller.offer.update({ id: 999, titleAr: "test" })).rejects.toThrow();
  });

  it("throws error if restaurant not owned by user", async () => {
    mockGetOfferById.mockResolvedValue(mockOffer);
    mockGetRestaurantById.mockResolvedValue({ ...mockRestaurant, userId: 999 });

    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(caller.offer.update({ id: 1, titleAr: "test" })).rejects.toThrow();
  });
});

describe("offer.delete", () => {
  it("deletes an offer owned by user", async () => {
    mockGetOfferById.mockResolvedValue(mockOffer);
    mockGetRestaurantById.mockResolvedValue(mockRestaurant);
    mockDeleteOffer.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.offer.delete({ id: 1 });

    expect(result).toEqual({ success: true });
    expect(mockDeleteOffer).toHaveBeenCalledWith(1);
  });

  it("throws error if offer not found", async () => {
    mockGetOfferById.mockResolvedValue(null);

    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(caller.offer.delete({ id: 999 })).rejects.toThrow();
  });

  it("throws error if restaurant not owned by user", async () => {
    mockGetOfferById.mockResolvedValue(mockOffer);
    mockGetRestaurantById.mockResolvedValue({ ...mockRestaurant, userId: 999 });

    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(caller.offer.delete({ id: 1 })).rejects.toThrow();
  });
});

describe("offer types validation", () => {
  it("accepts daily offer type", async () => {
    mockGetRestaurantById.mockResolvedValue(mockRestaurant);
    mockCreateOffer.mockResolvedValue({ id: 1 });

    const caller = appRouter.createCaller(createAuthContext(1));
    await caller.offer.create({
      restaurantId: 1,
      titleAr: "عرض يومي",
      offerType: "daily",
      originalPrice: "50",
      offerPrice: "25",
      startDate: "2026-04-01",
      endDate: "2026-04-01",
    });

    expect(mockCreateOffer).toHaveBeenCalledWith(expect.objectContaining({ offerType: "daily" }));
  });

  it("accepts weekly offer type", async () => {
    mockGetRestaurantById.mockResolvedValue(mockRestaurant);
    mockCreateOffer.mockResolvedValue({ id: 2 });

    const caller = appRouter.createCaller(createAuthContext(1));
    await caller.offer.create({
      restaurantId: 1,
      titleAr: "عرض أسبوعي",
      offerType: "weekly",
      originalPrice: "100",
      offerPrice: "60",
      startDate: "2026-04-01",
      endDate: "2026-04-07",
    });

    expect(mockCreateOffer).toHaveBeenCalledWith(expect.objectContaining({ offerType: "weekly" }));
  });

  it("accepts monthly offer type", async () => {
    mockGetRestaurantById.mockResolvedValue(mockRestaurant);
    mockCreateOffer.mockResolvedValue({ id: 3 });

    const caller = appRouter.createCaller(createAuthContext(1));
    await caller.offer.create({
      restaurantId: 1,
      titleAr: "عرض شهري",
      offerType: "monthly",
      originalPrice: "200",
      offerPrice: "100",
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    });

    expect(mockCreateOffer).toHaveBeenCalledWith(expect.objectContaining({ offerType: "monthly" }));
  });

  it("rejects invalid offer type", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(caller.offer.create({
      restaurantId: 1,
      titleAr: "عرض",
      offerType: "yearly" as any,
      originalPrice: "50",
      offerPrice: "25",
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    })).rejects.toThrow();
  });
});
