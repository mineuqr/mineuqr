import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTrialSubscription } from "./create-trial-subscription";
import { handlePayPalWebhook } from "./paypal-webhook";
import type { Request, Response } from "express";

// Mock database functions
vi.mock("./db", () => ({
  createUserSubscription: vi.fn(async (subscription: any) => {
    return { id: 1, ...subscription };
  }),
  getSubscriptionPlans: vi.fn(async () => [
    {
      id: 30001,
      nameEn: "Ordering Free",
      sortOrder: 0,
      isActive: true,
    },
    {
      id: 101,
      nameAr: "أساسي",
      nameEn: "Basic Plan",
      priceMonthly: "19",
      sortOrder: 1,
      isActive: true,
    },
    {
      id: 102,
      nameAr: "احترافي",
      nameEn: "Professional Plan",
      priceMonthly: "35",
      sortOrder: 2,
      isActive: true,
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
      };
    }
    return null;
  }),
  updateUserSubscription: vi.fn(async () => ({ success: true })),
  updateSubscriptionForActivation: vi.fn(async () => 42),
  getUserSubscription: vi.fn(async () => null),
  getRestaurantsByUser: vi.fn(async () => [{ id: 1, nameAr: "مطعم تجريبي" }]),
  getUserById: vi.fn(async (id: number) => ({
    id,
    name: "Test User",
    email: "user@test.com",
  })),
}));

// Mock PayPal functions
vi.mock("./paypal", () => ({
  capturePayPalOrder: vi.fn(async (params: any) => {
    return { status: "COMPLETED", id: params.orderId };
  }),
}));

vi.mock("./owner-email-notifications", () => ({
  notifyOwnerNewSubscription: vi.fn(async () => true),
}));

vi.mock("./services/commercial-catalog", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./services/commercial-catalog")>();
  return {
    ...actual,
    isKnownLegacyPlanId: vi.fn((id: number) => id === 30002 || id === 102),
    resolveLivePlanDisplayByLegacyId: vi.fn(async (id: number) =>
      id === 30002 || id === 1 || id === 102
        ? { id, nameAr: "الخطة الأساسية", nameEn: "Basic Plan" }
        : null
    ),
    resolveLivePlanDisplayByPlanRef: vi.fn(async () => ({
      id: 30002,
      nameAr: "الخطة الأساسية",
      nameEn: "Basic Plan",
    })),
    parseWebhookPlanRef: vi.fn((raw: unknown) => {
      if (raw == null || raw === "") return null;
      if (typeof raw === "number") return raw;
      const text = String(raw);
      if (/^\d+$/.test(text)) return Number(text);
      return text;
    }),
    ensureLivePlanBoundForSubscription: vi.fn(async () => ({
      planId: "plan-webhook-test",
    })),
    bindSubscriptionToLivePlan: vi.fn(async () => ({
      planId: "plan-trial-test",
      chargedTerms: null,
    })),
    ensureCatalogReady: vi.fn(async () => {}),
    resolveTrialPolicyFromCatalog: vi.fn(async () => ({
      professionalPlanId: "plan-trial-test",
      durationDays: 14,
      trialPolicyId: null,
      legacyPlanId: 102,
    })),
    resolveCanonicalLivePlanId: vi.fn(async () => "plan-webhook-test"),
    resolveLegacyPlanIdFromPlan: vi.fn(() => 30002),
  };
});

describe("Trial Subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTrialSubscription", () => {
    it("should create a 14-day trial subscription for new user", async () => {
      const { createUserSubscription } = await import("./db");

      await createTrialSubscription(123);

      expect(createUserSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 123,
          planId: "plan-trial-test",
          restaurantId: 0,
          status: "trial",
          billingCycle: "monthly",
        })
      );

      // Check that trialEndsAt is approximately 14 days from now
      const call = (createUserSubscription as any).mock.calls[0][0];
      const trialEndDate = new Date(call.trialEndsAt);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 14);

      const dayDifference = Math.abs(
        (trialEndDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(dayDifference).toBeLessThan(0.1); // Within 2.4 hours
    });

    it("should set currentPeriodEnd to 14 days from now", async () => {
      const { createUserSubscription } = await import("./db");

      await createTrialSubscription(456);

      const call = (createUserSubscription as any).mock.calls[0][0];
      const periodEnd = new Date(call.currentPeriodEnd);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 14);

      const dayDifference = Math.abs(
        (periodEnd.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(dayDifference).toBeLessThan(0.1);
    });
  });
});

describe("PayPal Webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handlePayPalWebhook", () => {
    it("should handle checkout.order.completed event", async () => {
      const { updateSubscriptionForActivation } = await import("./db");
      const { notifyOwnerNewSubscription } = await import(
        "./owner-email-notifications"
      );

      const mockReq = {
        body: {
          event_type: "checkout.order.completed",
          resource: {
            id: "PAYPAL-ORDER-123",
            purchase_units: [
              {
                custom_id: JSON.stringify({
                  userId: 789,
                  planId: 30002,
                }),
                amount: { currency_code: "USD", value: "29.00" },
              },
            ],
          },
        },
      } as unknown as Request;

      const mockRes = {
        json: vi.fn((data) => data),
        status: vi.fn(function (code: number) {
          this.statusCode = code;
          return this;
        }),
        statusCode: 200,
      } as unknown as Response;

      await handlePayPalWebhook(mockReq, mockRes);

      expect(updateSubscriptionForActivation).toHaveBeenCalledWith(
        789,
        expect.objectContaining({
          planId: "plan-webhook-test",
          status: "active",
          stripeSubscriptionId: "PAYPAL-ORDER-123",
        }),
        { planId: "plan-webhook-test" }
      );

      expect(notifyOwnerNewSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          userName: "Test User",
          userEmail: "user@test.com",
          planName: "الخطة الأساسية",
          billingCycle: "monthly",
          amount: "29.00 USD",
        })
      );
    });

    it("resolves new UUID custom_id.planId to the Live Plan UUID", async () => {
      const { updateSubscriptionForActivation } = await import("./db");
      const mockReq = {
        body: {
          event_type: "checkout.order.completed",
          resource: {
            id: "PAYPAL-ORDER-UUID",
            purchase_units: [
              {
                custom_id: JSON.stringify({
                  userId: 789,
                  planId: "11111111-1111-4111-8111-111111111111",
                }),
                amount: { currency_code: "USD", value: "29.00" },
              },
            ],
          },
        },
      } as unknown as Request;
      const mockRes = {
        json: vi.fn((data) => data),
        status: vi.fn(function (code: number) {
          this.statusCode = code;
          return this;
        }),
        statusCode: 200,
      } as unknown as Response;

      await handlePayPalWebhook(mockReq, mockRes);

      expect(updateSubscriptionForActivation).toHaveBeenCalledWith(
        789,
        expect.objectContaining({
          planId: "plan-webhook-test",
          status: "active",
        }),
        { planId: "plan-webhook-test" }
      );
    });

    it("should handle missing custom_id gracefully", async () => {
      const mockReq = {
        body: {
          event_type: "checkout.order.completed",
          resource: {
            id: "PAYPAL-ORDER-456",
            purchase_units: [{}],
          },
        },
      } as unknown as Request;

      const mockRes = {
        json: vi.fn((data) => data),
        status: vi.fn(function (code: number) {
          this.statusCode = code;
          return this;
        }),
        statusCode: 200,
      } as unknown as Response;

      const result = await handlePayPalWebhook(mockReq, mockRes);

      expect(result).toEqual({
        status: "error",
        message: "Missing custom_id",
      });
    });

    it("should return success for non-order events", async () => {
      const mockReq = {
        body: {
          event_type: "payment.capture.completed",
          resource: { id: "some-id" },
        },
      } as unknown as Request;

      const mockRes = {
        json: vi.fn((data) => data),
        status: vi.fn(function (code: number) {
          this.statusCode = code;
          return this;
        }),
        statusCode: 200,
      } as unknown as Response;

      const result = await handlePayPalWebhook(mockReq, mockRes);

      expect(result).toEqual({ status: "received" });
    });
  });
});
