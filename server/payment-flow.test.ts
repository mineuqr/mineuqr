import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// Mock all database functions BEFORE importing appRouter
vi.mock("./db", () => ({
  getSubscriptionPlanById: vi.fn(),
  getUserSubscription: vi.fn(),
  getCanonicalUserSubscription: vi.fn(),
  createUserSubscription: vi.fn(),
  updateUserSubscription: vi.fn(),
  getRestaurantsByUserId: vi.fn(),
  getSubscriptionPlans: vi.fn(),
  isSubscriptionActive: vi.fn(),
  getTrialEndDate: vi.fn(),
  getUserById: vi.fn(async (userId: number) => ({ id: userId, role: "user" })),
  getSubscriptionsByUser: vi.fn(async () => []),
}));

// Import AFTER mocking
import { appRouter } from "./routers";
import * as db from "./db";

// Mock PayPal
vi.mock("./paypal", () => ({
  createPayPalOrder: vi.fn(async (params: any) => {
    return "PAYPAL-ORDER-ID-" + params.userId;
  }),
  capturePayPalOrder: vi.fn(async (params: any) => {
    return { status: "COMPLETED", id: params.orderId };
  }),
}));

function createAuthContext(userId: number = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      email: `user${userId}@example.com`,
      name: `User ${userId}`,
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {
        origin: "https://qr-menu.test.com",
      },
    } as any,
    res: {} as any,
  };
}

describe("Payment Flow - End-to-End", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock responses
    (db.getSubscriptionPlanById as any).mockResolvedValue({
      id: 1,
      nameAr: "الخطة الأساسية",
      nameEn: "Basic Plan",
      priceMonthly: 29,
      priceYearly: 150,
      isActive: true,
    });

    (db.getSubscriptionPlans as any).mockResolvedValue([
      {
        id: 1,
        nameAr: "الخطة الأساسية",
        nameEn: "Basic Plan",
        priceMonthly: 29,
        priceYearly: 150,
        isActive: true,
      },
    ]);

    (db.getUserSubscription as any).mockResolvedValue(null);
    (db.getCanonicalUserSubscription as any).mockResolvedValue(null);
    (db.isSubscriptionActive as any).mockResolvedValue(false);
    (db.getTrialEndDate as any).mockResolvedValue(null);
    (db.getRestaurantsByUserId as any).mockResolvedValue([]);
  });

  describe("Complete Payment Journey", () => {
    it("should list subscription plans", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const plans = await caller.subscription.listPlans();
      expect(plans).toHaveLength(1);
      expect(plans[0].priceYearly).toBe(150);
    });

    it("should create checkout session for yearly plan", async () => {
      const userId = 1;
      const ctx = createAuthContext(userId);
      const caller = appRouter.createCaller(ctx);

      const checkoutSession = await caller.subscription.createCheckoutSession({
        planId: 1,
        billingCycle: "yearly",
      });

      expect(checkoutSession.orderId).toBe("PAYPAL-ORDER-ID-1");
    });

    it("should create checkout session for monthly plan", async () => {
      const userId = 2;
      const ctx = createAuthContext(userId);
      const caller = appRouter.createCaller(ctx);

      const checkoutSession = await caller.subscription.createCheckoutSession({
        planId: 1,
        billingCycle: "monthly",
      });

      expect(checkoutSession.orderId).toBe("PAYPAL-ORDER-ID-2");
    });

    it("should include correct return URLs in checkout", async () => {
      const { createPayPalOrder } = await import("./paypal");
      const ctx = createAuthContext(3);
      const caller = appRouter.createCaller(ctx);

      await caller.subscription.createCheckoutSession({
        planId: 1,
        billingCycle: "yearly",
      });

      expect(createPayPalOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          returnUrl: expect.stringContaining("/subscription/success"),
          cancelUrl: expect.stringContaining("/subscription/cancel"),
        })
      );
    });

    it("should include user metadata in PayPal order", async () => {
      const { createPayPalOrder } = await import("./paypal");
      const userId = 4;
      const ctx = createAuthContext(userId);
      const caller = appRouter.createCaller(ctx);

      await caller.subscription.createCheckoutSession({
        planId: 1,
        billingCycle: "yearly",
      });

      expect(createPayPalOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: userId,
          planId: 1,
          amount: "150",
          currency: "USD",
        })
      );
    });

    it("should reject payment for non-existent plan", async () => {
      (db.getSubscriptionPlanById as any).mockResolvedValueOnce(null);
      const ctx = createAuthContext(5);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.subscription.createCheckoutSession({
          planId: 999,
          billingCycle: "yearly",
        })
      ).rejects.toThrow("الخطة غير موجودة");
    });

    it("should require authentication for payment operations", async () => {
      const caller = appRouter.createCaller({ user: null } as any);

      await expect(
        caller.subscription.createCheckoutSession({
          planId: 1,
          billingCycle: "yearly",
        })
      ).rejects.toThrow();
    });
  });

  describe("Trial Subscription Flow", () => {
    it("should retrieve trial subscription for users", async () => {
      const userId = 7;
      const ctx = createAuthContext(userId);

      (db.getUserSubscription as any).mockResolvedValueOnce({
        id: 1,
        userId,
        planId: 1,
        status: "trial",
        billingCycle: "monthly",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        stripeSubscriptionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (db.getCanonicalUserSubscription as any).mockResolvedValueOnce({
        id: 1,
        userId,
        planId: 1,
        status: "trial",
        billingCycle: "monthly",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        stripeSubscriptionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const caller = appRouter.createCaller(ctx);
      const subscription = await caller.subscription.getCurrentSubscription();

      expect(subscription?.subscription.status).toBe("trial");
      expect(subscription?.subscription.planId).toBe(1);
      expect(subscription?.plan.nameAr).toBe("الخطة الأساسية");
    });

    it("should check trial status correctly", async () => {
      const userId = 8;
      const ctx = createAuthContext(userId);

      (db.isSubscriptionActive as any).mockResolvedValueOnce(true);
      (db.getTrialEndDate as any).mockResolvedValueOnce(
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      );

      const caller = appRouter.createCaller(ctx);
      const status = await caller.subscription.checkTrialStatus();

      expect(status.isActive).toBe(true);
      expect(status.trialEndDate).toBeDefined();
    });
  });
});
