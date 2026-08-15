import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./services/commercial-catalog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./services/commercial-catalog")>();
  return {
    ...actual,
    listPlansForSelectionLegacyShape: vi.fn(async () => ({
      source: "catalog" as const,
      plans: [
        {
          id: 1,
          nameAr: "الخطة الأساسية",
          nameEn: "Basic Plan",
          priceMonthly: 29,
          priceYearly: 150,
          catalogPlanId: "live-basic",
        },
      ],
    })),
    resolveSubscriptionPlanView: vi.fn(async (planId: number) =>
      planId === 1
        ? {
            id: 1,
            nameAr: "الخطة الأساسية",
            nameEn: "Basic Plan",
            priceMonthly: "29",
            priceYearly: "150",
          }
        : null
    ),
    resolveCheckoutOfferFromLivePlan: vi.fn(
      async (planId: number, billingCycle: "monthly" | "yearly") => {
        if (planId !== 1) return null;
        return {
          legacyPlanId: planId,
          planId: "live-basic",
          planCode: "basic",
          commercialName: "الخطة الأساسية",
          amount: billingCycle === "yearly" ? "150" : "29",
          currency: "USD",
          billingCycleCode: billingCycle,
        };
      }
    ),
  };
});

// Mock database functions
vi.mock("./db", () => ({
  getDb: vi.fn(async () => null),
  generateOrderNumber: vi.fn(async () => "ORD-MOCK-001"),
  getSubscriptionPlans: vi.fn(async () => [
    {
      id: 1,
      nameAr: "الخطة الأساسية",
      nameEn: "Basic Plan",
      descriptionAr: "مثالية للمطاعم الصغيرة",
      descriptionEn: "Perfect for small restaurants",
      priceMonthly: 29,
      priceYearly: 150,
      maxRestaurants: 1,
      maxItemsPerRestaurant: 100,
      maxCategories: 10,
      features: JSON.stringify(["منيو رقمي واحد", "رمز QR مخصص"]),
      isActive: true,
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getSubscriptionPlanById: vi.fn(async (id: number) => {
    if (id === 1) {
      return {
        id: 1,
        nameAr: "الخطة الأساسية",
        nameEn: "Basic Plan",
        priceMonthly: 29,
        priceYearly: 150,
        isActive: true,
      };
    }
    return null;
  }),
  getUserSubscription: vi.fn(async (userId: number) => {
    if (userId === 1) {
      return {
        id: 1,
        userId: 1,
        planId: 1,
        status: "trial",
        billingCycle: "monthly",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        stripeSubscriptionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return null;
  }),
  getCanonicalUserSubscription: vi.fn(async (userId: number) => {
    if (userId === 1) {
      return {
        id: 1,
        userId: 1,
        planId: 1,
        status: "trial",
        billingCycle: "monthly",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        stripeSubscriptionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return null;
  }),
  getUserById: vi.fn(async (userId: number) => {
    if (userId === 1) return { id: 1, role: "user" };
    return null;
  }),
  getSubscriptionsByUser: vi.fn(async (userId: number) => {
    if (userId === 1) {
      return [
        {
          id: 1,
          userId: 1,
          restaurantId: 0,
          planId: 30002,
          status: "trial",
          billingCycle: "monthly",
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          stripeSubscriptionId: null,
          stripeCustomerId: null,
          canceledAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }
    return [];
  }),
  isSubscriptionActive: vi.fn(async (userId: number) => {
    if (userId === 1) return true;
    return false;
  }),
  getTrialEndDate: vi.fn(async (userId: number) => {
    if (userId === 1) {
      return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    }
    return null;
  }),
  updateUserSubscription: vi.fn(async () => ({ success: true })),
}));

// Mock PayPal functions
vi.mock("./paypal", () => ({
  createPayPalOrder: vi.fn(async (params: any) => {
    return {
      orderId: "PAYPAL-ORDER-ID-123",
      checkoutUrl: "https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-ORDER-ID-123",
    };
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

describe("subscription router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listPlans", () => {
    it("should return all active subscription plans", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      const plans = await caller.subscription.listPlans();

      expect(plans).toHaveLength(1);
      expect(plans[0].nameAr).toBe("الخطة الأساسية");
      expect(plans[0].priceYearly).toBe(150);
    });
  });

  describe("getCurrentSubscription", () => {
    it("should return current subscription for authenticated user", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.subscription.getCurrentSubscription();

      expect(result).toBeDefined();
      expect(result?.subscription.status).toBe("trial");
      expect(result?.plan.nameAr).toBe("الخطة الأساسية");
    });

    it("should return null if user has no subscription", async () => {
      const ctx = createAuthContext(999);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.subscription.getCurrentSubscription();

      expect(result).toBeNull();
    });

    it("should require authentication", async () => {
      const caller = appRouter.createCaller({ user: null } as any);
      await expect(caller.subscription.getCurrentSubscription()).rejects.toThrow();
    });
  });

  describe("checkTrialStatus", () => {
    it("should return trial status for user", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.subscription.checkTrialStatus();

      expect(result.isActive).toBe(true);
      expect(result.trialEndDate).toBeDefined();
    });

    it("should require authentication", async () => {
      const caller = appRouter.createCaller({ user: null } as any);
      await expect(caller.subscription.checkTrialStatus()).rejects.toThrow();
    });
  });

  describe("createCheckoutSession", () => {
    it("should create PayPal checkout session for yearly plan", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.subscription.createCheckoutSession({
        planId: 1,
        billingCycle: "yearly",
      });

      expect(result.orderId).toBe("PAYPAL-ORDER-ID-123");
    });

    it("should create PayPal checkout session for monthly plan", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.subscription.createCheckoutSession({
        planId: 1,
        billingCycle: "monthly",
      });

      expect(result.orderId).toBe("PAYPAL-ORDER-ID-123");
    });

    it("should throw error for non-existent plan", async () => {
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.subscription.createCheckoutSession({
          planId: 999,
          billingCycle: "yearly",
        })
      ).rejects.toThrow("الخطة غير موجودة");
    });

    it("should require authentication", async () => {
      const caller = appRouter.createCaller({ user: null } as any);

      await expect(
        caller.subscription.createCheckoutSession({
          planId: 1,
          billingCycle: "yearly",
        })
      ).rejects.toThrow();
    });

    it("should include origin in PayPal order creation", async () => {
      const { createPayPalOrder } = await import("./paypal");
      const ctx = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      await caller.subscription.createCheckoutSession({
        planId: 1,
        billingCycle: "yearly",
      });

      expect(createPayPalOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          planId: 1,
          amount: "150",
          currency: "USD",
          returnUrl: expect.stringContaining("/subscription/success"),
          cancelUrl: expect.stringContaining("/subscription/cancel"),
        })
      );
    });
  });
});
