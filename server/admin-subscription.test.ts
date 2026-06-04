import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  getAllRestaurantsWithSubscriptions: vi.fn(),
  createSubscriptionForRestaurant: vi.fn(),
  updateSubscriptionById: vi.fn(),
  cancelSubscriptionById: vi.fn(),
  getSubscriptionForRestaurant: vi.fn(),
  getSubscriptionByRestaurantId: vi.fn(),
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

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed"), compare: vi.fn() },
}));

vi.mock("./paypal", () => ({
  createPayPalOrder: vi.fn(),
}));

import { appRouter } from "./routers";
import {
  getAllRestaurantsWithSubscriptions,
  createSubscriptionForRestaurant,
  updateSubscriptionById,
  cancelSubscriptionById,
  getSubscriptionForRestaurant,
} from "./db";

const adminUser = { id: 1, openId: "admin_1", name: "Admin", email: "admin@test.com", role: "admin" as const, loginMethod: "email", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), passwordHash: null };
const regularUser = { id: 2, openId: "user_2", name: "User", email: "user@test.com", role: "user" as const, loginMethod: "email", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), passwordHash: null };

function createCaller(user: any) {
  return appRouter.createCaller({
    user,
    req: { headers: { origin: "http://localhost:3000" } } as any,
    res: { clearCookie: vi.fn() } as any,
  });
}

describe("Admin Subscription Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listAllRestaurantsWithSubscriptions", () => {
    it("should return restaurants with subscriptions for admin", async () => {
      const mockData = [
        { id: 1, nameAr: "مطعم 1", subscription: { id: 1, status: "active" } },
        { id: 2, nameAr: "مطعم 2", subscription: null },
      ];
      (getAllRestaurantsWithSubscriptions as any).mockResolvedValue(mockData);

      const caller = createCaller(adminUser);
      const result = await caller.admin.listAllRestaurantsWithSubscriptions();

      expect(result).toEqual(mockData);
      expect(getAllRestaurantsWithSubscriptions).toHaveBeenCalled();
    });

    it("should reject non-admin users", async () => {
      const caller = createCaller(regularUser);
      await expect(caller.admin.listAllRestaurantsWithSubscriptions()).rejects.toThrow();
    });
  });

  describe("createRestaurantSubscription", () => {
    it("should create subscription for restaurant", async () => {
      (getSubscriptionForRestaurant as any).mockResolvedValue(undefined);
      (createSubscriptionForRestaurant as any).mockResolvedValue({ id: 1 });

      const caller = createCaller(adminUser);
      const result = await caller.admin.createRestaurantSubscription({
        restaurantId: 1,
        planId: 1,
        billingCycle: "monthly",
      });

      expect(result.success).toBe(true);
      expect(result.subscriptionId).toBe(1);
      expect(createSubscriptionForRestaurant).toHaveBeenCalledWith(
        expect.objectContaining({
          restaurantId: 1,
          planId: 1,
          billingCycle: "monthly",
          status: "active",
        })
      );
    });

    it("should reject if restaurant already has subscription", async () => {
      (getSubscriptionForRestaurant as any).mockResolvedValue({ id: 1, status: "active" });

      const caller = createCaller(adminUser);
      await expect(
        caller.admin.createRestaurantSubscription({
          restaurantId: 1,
          planId: 1,
          billingCycle: "monthly",
        })
      ).rejects.toThrow();
    });

    it("should use custom end date if provided", async () => {
      (getSubscriptionForRestaurant as any).mockResolvedValue(undefined);
      (createSubscriptionForRestaurant as any).mockResolvedValue({ id: 2 });

      const caller = createCaller(adminUser);
      await caller.admin.createRestaurantSubscription({
        restaurantId: 2,
        planId: 1,
        billingCycle: "yearly",
        subscriptionEndDate: "2027-01-01",
      });

      expect(createSubscriptionForRestaurant).toHaveBeenCalledWith(
        expect.objectContaining({
          currentPeriodEnd: new Date("2027-01-01").toISOString(),
        })
      );
    });

    it("should reject non-admin users", async () => {
      const caller = createCaller(regularUser);
      await expect(
        caller.admin.createRestaurantSubscription({
          restaurantId: 1,
          planId: 1,
          billingCycle: "monthly",
        })
      ).rejects.toThrow();
    });
  });

  describe("updateRestaurantSubscription", () => {
    it("should update subscription", async () => {
      (updateSubscriptionById as any).mockResolvedValue(undefined);

      const caller = createCaller(adminUser);
      const result = await caller.admin.updateRestaurantSubscription({
        subscriptionId: 1,
        status: "active",
        billingCycle: "yearly",
      });

      expect(result.success).toBe(true);
      expect(updateSubscriptionById).toHaveBeenCalledWith(1, {
        status: "active",
        billingCycle: "yearly",
      });
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
    it("should cancel subscription", async () => {
      (cancelSubscriptionById as any).mockResolvedValue(undefined);

      const caller = createCaller(adminUser);
      const result = await caller.admin.cancelRestaurantSubscription({
        subscriptionId: 1,
      });

      expect(result.success).toBe(true);
      expect(cancelSubscriptionById).toHaveBeenCalledWith(1);
    });

    it("should reject non-admin users", async () => {
      const caller = createCaller(regularUser);
      await expect(
        caller.admin.cancelRestaurantSubscription({ subscriptionId: 1 })
      ).rejects.toThrow();
    });
  });
});
