import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { EMAIL_NOT_VERIFIED_ERR_MSG } from "@shared/const";
import type { TrpcContext } from "./_core/context";
import type { SelectUser } from "../drizzle/schema";

vi.mock("./db", () => ({
  getCategoryById: vi.fn(async (id: number) =>
    id === 1 ? { id: 1, restaurantId: 1, nameAr: "cat" } : null
  ),
  createCategory: vi.fn(async (input: unknown) => input),
  updateCategory: vi.fn(async () => undefined),
  deleteCategory: vi.fn(async () => undefined),
  getCategoriesByRestaurant: vi.fn(async () => []),
  getMenuItemById: vi.fn(async (id: number) =>
    id === 1
      ? {
          id: 1,
          restaurantId: 1,
          categoryId: 1,
          nameAr: "حمص",
          nameEn: null,
          price: "10.00",
          isAvailable: true,
        }
      : null
  ),
  createMenuItem: vi.fn(async (input: unknown) => input),
  updateMenuItem: vi.fn(async () => undefined),
  deleteMenuItem: vi.fn(async () => undefined),
  getOfferById: vi.fn(async (id: number) =>
    id === 1 ? { id: 1, restaurantId: 1 } : null
  ),
  createOffer: vi.fn(async (input: unknown) => input),
  updateOffer: vi.fn(async () => undefined),
  deleteOffer: vi.fn(async () => undefined),
  getHolidayById: vi.fn(async (id: number) =>
    id === 1 ? { id: 1, restaurantId: 1 } : null
  ),
  createHoliday: vi.fn(async () => 1),
  updateHoliday: vi.fn(async () => undefined),
  deleteHoliday: vi.fn(async () => undefined),
  getTableById: vi.fn(async (id: number) =>
    id === 1 ? { id: 1, restaurantId: 1, tableNumber: 1 } : null
  ),
  createTable: vi.fn(async (input: unknown) => input),
  createMultipleTables: vi.fn(async () => ({ created: 2 })),
  updateTable: vi.fn(async () => undefined),
  deleteTable: vi.fn(async () => undefined),
  getOrderById: vi.fn(async (id: number) =>
    id === 1 ? { id: 1, restaurantId: 1, status: "pending" } : null
  ),
  updateOrderStatus: vi.fn(async () => undefined),
  markOrderReadyAtIfFirstTransition: vi.fn(async () => undefined),
  getOrdersWithItemsByRestaurant: vi.fn(async () => [
    { id: 1, restaurantId: 1, status: "pending", totalAmount: "10.00", items: [] },
  ]),
  getOrderItemsByOrderId: vi.fn(async () => []),
  getActiveOrdersCount: vi.fn(async () => 2),
  getRestaurantStats: vi.fn(async () => ({
    totalCategories: 3,
    totalItems: 12,
    viewCount: 100,
  })),
  getRestaurantById: vi.fn(async (id: number) =>
    id === 1
      ? {
          id: 1,
          userId: 10,
          nameAr: "r",
          isActive: true,
          workingHours: null,
          temporaryClosure: null,
          currencySymbol: "ر.س",
        }
      : null
  ),
  getTableByRestaurantAndNumber: vi.fn(async () => ({ id: 1, tableNumber: 1 })),
  createOrder: vi.fn(async () => ({ id: 99 })),
  createOrderItems: vi.fn(async () => undefined),
  generateOrderNumber: vi.fn(async () => "ORD-1"),
  createNotification: vi.fn(async () => ({ id: 1 })),
  getSubscriptionsByUser: vi.fn(async () => [
    {
      id: 1,
      userId: 10,
      restaurantId: 0,
      planId: 2,
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 86400000).toISOString(),
      trialEndsAt: null,
    },
  ]),
  getSubscriptionPlans: vi.fn(async () => [
    { id: 1, maxRestaurants: 1, maxItemsPerRestaurant: 100, maxCategories: 10 },
    { id: 2, maxRestaurants: 5, maxItemsPerRestaurant: 500, maxCategories: 25 },
  ]),
  getSubscriptionPlanById: vi.fn(async (id: number) => {
    if (id === 2) {
      return { id: 2, maxRestaurants: 5, maxItemsPerRestaurant: 500, maxCategories: 25 };
    }
    if (id === 1) {
      return { id: 1, maxRestaurants: 1, maxItemsPerRestaurant: 100, maxCategories: 10 };
    }
    return null;
  }),
}));

vi.mock("./local-uploads", () => ({
  putUploadedFile: vi.fn(async () => ({ url: "https://example.com/img.png" })),
}));

vi.mock("./restaurantAccess", () => ({
  assertRestaurantAccess: vi.fn(async () => undefined),
}));

vi.mock("./commercial/guestOrderingAuthority", () => ({
  resolveGuestOrderingAllowed: vi.fn(async () => ({ canOrder: true })),
}));

import { appRouter } from "./routers";

function baseUser(overrides: Partial<SelectUser> = {}): SelectUser {
  return {
    id: 10,
    openId: "local_owner@example.com",
    name: "Owner",
    email: "owner@example.com",
    loginMethod: "email",
    passwordHash: "hash",
    emailVerifiedAt: null,
    passwordChangedAt: null,
    sessionValidAfter: null,
    role: "user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSignedIn: new Date().toISOString(),
    ...overrides,
  };
}

function createContext(user: SelectUser | null): TrpcContext {
  return {
    user,
    req: { headers: { origin: "https://www.mineuqr.com" } } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

async function expectForbiddenUnverified(
  run: () => Promise<unknown>
): Promise<void> {
  await expect(run()).rejects.toMatchObject({
    code: "FORBIDDEN",
    message: EMAIL_NOT_VERIFIED_ERR_MSG,
  });
}

describe("Phase C verifiedProcedure mutations (AUTH-POLICY-1C.1)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    delete process.env.AUTH_REQUIRE_VERIFIED_EMAIL;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("AUTH_REQUIRE_VERIFIED_EMAIL off", () => {
    it("allows unverified local user on category.create", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expect(
        caller.category.create({
          restaurantId: 1,
          nameAr: "مقبلات",
        })
      ).resolves.toBeDefined();
    });

    it("allows unverified local user on order.list", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expect(
        caller.order.list({ restaurantId: 1 })
      ).resolves.toHaveLength(1);
    });

    it("allows unverified local user on order.updateStatus", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expect(
        caller.order.updateStatus({ id: 1, status: "preparing" })
      ).resolves.toEqual({
        success: true,
        orderId: 1,
        previousStatus: "pending",
        newStatus: "preparing",
      });
    });

    it("allows public order.create without session", async () => {
      const caller = appRouter.createCaller(createContext(null));
      await expect(
        caller.order.create({
          restaurantId: 1,
          tableId: 1,
          tableNumber: 1,
          items: [{ menuItemId: 1, quantity: 1 }],
        })
      ).resolves.toBeDefined();
    });
  });

  describe("AUTH_REQUIRE_VERIFIED_EMAIL on", () => {
    beforeEach(() => {
      vi.stubEnv("AUTH_REQUIRE_VERIFIED_EMAIL", "1");
    });

    it("blocks unverified local user on category.create", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expectForbiddenUnverified(() =>
        caller.category.create({ restaurantId: 1, nameAr: "x" })
      );
    });

    it("blocks unverified local user on menuItem.create", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expectForbiddenUnverified(() =>
        caller.menuItem.create({
          categoryId: 1,
          restaurantId: 1,
          nameAr: "item",
          price: "10",
        })
      );
    });

    it("blocks unverified local user on offer.delete", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expectForbiddenUnverified(() => caller.offer.delete({ id: 1 }));
    });

    it("blocks unverified local user on holiday.update", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expectForbiddenUnverified(() =>
        caller.holiday.update({ id: 1, titleAr: "عطلة" })
      );
    });

    it("blocks unverified local user on table.createMultiple", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expectForbiddenUnverified(() =>
        caller.table.createMultiple({ restaurantId: 1, count: 2 })
      );
    });

    it("blocks unverified local user on order.list", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expectForbiddenUnverified(() =>
        caller.order.list({ restaurantId: 1 })
      );
    });

    it("blocks unverified local user on order.getById", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expectForbiddenUnverified(() => caller.order.getById({ id: 1 }));
    });

    it("blocks unverified local user on order.activeCount", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expectForbiddenUnverified(() =>
        caller.order.activeCount({ restaurantId: 1 })
      );
    });

    it("blocks unverified local user on order.updateStatus", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expectForbiddenUnverified(() =>
        caller.order.updateStatus({ id: 1, status: "ready" })
      );
    });

    it("allows verified local user on order.list", async () => {
      const caller = appRouter.createCaller(
        createContext(baseUser({ emailVerifiedAt: new Date().toISOString() }))
      );
      await expect(
        caller.order.list({ restaurantId: 1 })
      ).resolves.toHaveLength(1);
    });

    it("allows verified local user on order.activeCount", async () => {
      const caller = appRouter.createCaller(
        createContext(baseUser({ emailVerifiedAt: new Date().toISOString() }))
      );
      await expect(
        caller.order.activeCount({ restaurantId: 1 })
      ).resolves.toBe(2);
    });

    it("allows admin bypass on order.getById", async () => {
      const caller = appRouter.createCaller(
        createContext(baseUser({ role: "admin", emailVerifiedAt: null }))
      );
      await expect(caller.order.getById({ id: 1 })).resolves.toMatchObject({
        id: 1,
        items: [],
      });
    });

    it("allows OAuth user on order.list", async () => {
      const caller = appRouter.createCaller(
        createContext(baseUser({ loginMethod: "manus", emailVerifiedAt: null }))
      );
      await expect(
        caller.order.list({ restaurantId: 1 })
      ).resolves.toHaveLength(1);
    });

    it("allows verified local user on table.create", async () => {
      const caller = appRouter.createCaller(
        createContext(baseUser({ emailVerifiedAt: new Date().toISOString() }))
      );
      await expect(
        caller.table.create({ restaurantId: 1, tableNumber: 5 })
      ).resolves.toBeDefined();
    });

    it("allows admin bypass on menuItem.delete", async () => {
      const caller = appRouter.createCaller(
        createContext(baseUser({ role: "admin", emailVerifiedAt: null }))
      );
      await expect(caller.menuItem.delete({ id: 1 })).resolves.toEqual({
        success: true,
      });
    });

    it("allows OAuth user on offer.create", async () => {
      const caller = appRouter.createCaller(
        createContext(baseUser({ loginMethod: "manus", emailVerifiedAt: null }))
      );
      await expect(
        caller.offer.create({
          restaurantId: 1,
          titleAr: "عرض",
          offerType: "daily",
          originalPrice: "100",
          offerPrice: "80",
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(),
        })
      ).resolves.toBeDefined();
    });

    it("does not block restaurant.stats for unverified local user", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expect(caller.restaurant.stats({ id: 1 })).resolves.toBeDefined();
    });

    it("does not block category.list for unverified local user", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expect(caller.category.list({ restaurantId: 1 })).resolves.toEqual(
        []
      );
    });

    it("does not block public table.getByNumber", async () => {
      const caller = appRouter.createCaller(createContext(null));
      await expect(
        caller.table.getByNumber({ restaurantId: 1, tableNumber: 1 })
      ).resolves.toBeDefined();
    });

    it("does not block public order.create when flag on", async () => {
      const caller = appRouter.createCaller(createContext(null));
      await expect(
        caller.order.create({
          restaurantId: 1,
          tableId: 1,
          tableNumber: 1,
          items: [{ menuItemId: 1, quantity: 1 }],
        })
      ).resolves.toBeDefined();
    });

    it("throws TRPCError FORBIDDEN (not internal error)", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      try {
        await caller.holiday.delete({ id: 1 });
        expect.fail("expected throw");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("FORBIDDEN");
      }
    });
  });
});
