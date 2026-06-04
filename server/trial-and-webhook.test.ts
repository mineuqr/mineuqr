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
      id: 30002,
      nameAr: "أساسي",
      nameEn: "Basic",
      priceMonthly: "29",
      sortOrder: 1,
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
}));

// Mock PayPal functions
vi.mock("./paypal", () => ({
  capturePayPalOrder: vi.fn(async (params: any) => {
    return { status: "COMPLETED", id: params.orderId };
  }),
}));

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => ({ success: true })),
}));

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
          planId: 30002,
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
      const { notifyOwner } = await import("./_core/notification");

      const mockReq = {
        body: {
          event_type: "checkout.order.completed",
          resource: {
            id: "PAYPAL-ORDER-123",
            purchase_units: [
              {
                custom_id: JSON.stringify({
                  userId: 789,
                  planId: 1,
                }),
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
          planId: 1,
          status: "active",
          stripeSubscriptionId: "PAYPAL-ORDER-123",
        }),
        { planId: 1 }
      );

      expect(notifyOwner).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("اشتراك جديد"),
        })
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
