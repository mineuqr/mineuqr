import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./db", () => ({
  generateOrderNumber: vi.fn(async () => "ORD-MOCK-001"),
  createSubscriptionForRestaurant: vi.fn(),
  updateSubscriptionById: vi.fn(),
  cancelSubscriptionById: vi.fn(),
  getSubscriptionForRestaurant: vi.fn(),
  getSubscriptionById: vi.fn(),
  getSubscriptionPlans: vi.fn(),
  getSubscriptionPlanById: vi.fn(),
  getUserSubscription: vi.fn(),
  isSubscriptionActive: vi.fn(),
  getTrialEndDate: vi.fn(),
  createUserSubscription: vi.fn(),
  updateUserSubscription: vi.fn(),
  getRestaurantsByUser: vi.fn(),
  getRestaurantById: vi.fn(),
  getRestaurantBySlug: vi.fn(),
  createRestaurant: vi.fn(),
  updateRestaurant: vi.fn(),
  incrementViewCount: vi.fn(),
  getCategoriesByRestaurant: vi.fn(),
  getCategoryById: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  getMenuItemsByCategory: vi.fn(),
  getMenuItemsByRestaurant: vi.fn(),
  getMenuItemById: vi.fn(),
  createMenuItem: vi.fn(),
  updateMenuItem: vi.fn(),
  deleteMenuItem: vi.fn(),
  getRestaurantStats: vi.fn(),
  getOffersByRestaurant: vi.fn(),
  getActiveOffersByRestaurant: vi.fn(),
  getOfferById: vi.fn(),
  createOffer: vi.fn(),
  updateOffer: vi.fn(),
  deleteOffer: vi.fn(),
  getInvoicesByUser: vi.fn(),
  getInvoiceById: vi.fn(),
  getUnpaidInvoices: vi.fn(),
  getNotificationsByUser: vi.fn(),
  getUnreadNotifications: vi.fn(),
  markNotificationAsRead: vi.fn(),
  getCurrencyByCountryCode: vi.fn(),
  getAllCountriesCurrencies: vi.fn(),
  upsertUser: vi.fn(),
  getUserByEmail: vi.fn(),
  updateUserPassword: vi.fn(),
  updateUserProfile: vi.fn(),
  getAllSubscriptions: vi.fn(),
  createNotification: vi.fn(),
  markNotificationAsSent: vi.fn(),
  getUnsentNotifications: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed"), compare: vi.fn() },
}));

vi.mock("./paypal", () => ({
  createPayPalOrder: vi.fn(),
}));

import { appRouter } from "./routers";

const adminUser = { id: 1, openId: "admin_1", name: "Admin", email: "admin@test.com", role: "admin" as const, loginMethod: "email", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), passwordHash: null };
const regularUser = { id: 2, openId: "user_2", name: "User", email: "user@test.com", role: "user" as const, loginMethod: "email", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), passwordHash: null };

function createCaller(user: any) {
  return appRouter.createCaller({
    user,
    req: { headers: { origin: "http://localhost:3000" } } as any,
    res: { clearCookie: vi.fn() } as any,
  });
}

const RETIRED = expect.objectContaining({
  code: "PRECONDITION_FAILED",
  message: expect.stringContaining("AUTHORITY-CLEANUP-1"),
} satisfies Partial<TRPCError>);

describe("Admin Subscription Management — AUTHORITY-CLEANUP-1 retirement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createRestaurantSubscription", () => {
    it("is retired — directs to owner-level APIs", async () => {
      const caller = createCaller(adminUser);
      await expect(
        caller.admin.createRestaurantSubscription({
          restaurantId: 1,
          planId: "11111111-1111-4111-8111-111111111111",
          billingCycle: "monthly",
        })
      ).rejects.toMatchObject(RETIRED);
    });

    it("should reject non-admin users before retirement check", async () => {
      const caller = createCaller(regularUser);
      await expect(
        caller.admin.createRestaurantSubscription({
          restaurantId: 1,
          planId: "11111111-1111-4111-8111-111111111111",
          billingCycle: "monthly",
        })
      ).rejects.toThrow();
    });
  });

  describe("updateRestaurantSubscription", () => {
    it("is retired", async () => {
      const caller = createCaller(adminUser);
      await expect(
        caller.admin.updateRestaurantSubscription({
          subscriptionId: 1,
          status: "active",
        })
      ).rejects.toMatchObject(RETIRED);
    });

    it("should reject non-admin users", async () => {
      const caller = createCaller(regularUser);
      await expect(
        caller.admin.updateRestaurantSubscription({
          subscriptionId: 1,
          status: "active",
        })
      ).rejects.toThrow();
    });
  });

  describe("cancelRestaurantSubscription", () => {
    it("is retired", async () => {
      const caller = createCaller(adminUser);
      await expect(
        caller.admin.cancelRestaurantSubscription({ subscriptionId: 1 })
      ).rejects.toMatchObject(RETIRED);
    });

    it("should reject non-admin users", async () => {
      const caller = createCaller(regularUser);
      await expect(
        caller.admin.cancelRestaurantSubscription({ subscriptionId: 1 })
      ).rejects.toThrow();
    });
  });
});
