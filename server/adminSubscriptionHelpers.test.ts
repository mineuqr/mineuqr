import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./db", () => ({
  getRestaurantById: vi.fn(),
  getRestaurantsByUser: vi.fn(),
  getSubscriptionById: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
}));

import {
  getRestaurantById,
  getRestaurantsByUser,
  getSubscriptionById,
  getUserByEmail,
  getUserById,
} from "./db";
import {
  applyAdminTrialStatusUpdate,
  assertRestaurantSubscriptionForUpdate,
  assertSubscriptionEligibleForAdminInvoice,
  buildAdminSubscriptionInsert,
  resolveAdminRestaurantOwnerUserId,
  resolveRestaurantOwnerUserId,
  resolveSubscriptionRestaurantIdForUser,
} from "./adminSubscriptionHelpers";

describe("adminSubscriptionHelpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveRestaurantOwnerUserId", () => {
    it("returns restaurant owner when no override", async () => {
      (getRestaurantById as any).mockResolvedValue({ id: 1, userId: 42 });
      await expect(resolveRestaurantOwnerUserId(1, undefined)).resolves.toBe(42);
    });

    it("rejects override that does not match owner", async () => {
      (getRestaurantById as any).mockResolvedValue({ id: 1, userId: 42 });
      await expect(resolveRestaurantOwnerUserId(1, 99)).rejects.toBeInstanceOf(TRPCError);
    });
  });

  describe("resolveSubscriptionRestaurantIdForUser", () => {
    it("requires restaurantId when user owns restaurants", async () => {
      (getRestaurantsByUser as any).mockResolvedValue([{ id: 10 }]);
      await expect(
        resolveSubscriptionRestaurantIdForUser(5, undefined)
      ).rejects.toBeInstanceOf(TRPCError);
    });

    it("allows account-level subscription when user has no restaurants", async () => {
      (getRestaurantsByUser as any).mockResolvedValue([]);
      await expect(
        resolveSubscriptionRestaurantIdForUser(5, undefined)
      ).resolves.toBe(0);
    });

    it("validates restaurant ownership", async () => {
      (getRestaurantById as any).mockResolvedValue({ id: 10, userId: 5 });
      await expect(
        resolveSubscriptionRestaurantIdForUser(5, 10)
      ).resolves.toBe(10);
    });
  });

  describe("buildAdminSubscriptionInsert", () => {
    it("sets trialEndsAt for trial status", () => {
      const row = buildAdminSubscriptionInsert(
        {
          userId: 1,
          restaurantId: 2,
          planId: 3,
          status: "trial",
          billingCycle: "monthly",
        },
        new Date("2026-01-01T00:00:00.000Z")
      );
      expect(row.status).toBe("trial");
      expect(row.trialEndsAt).toBeDefined();
      expect(row.currentPeriodEnd).toBe(row.trialEndsAt);
    });
  });

  describe("resolveAdminRestaurantOwnerUserId", () => {
    it("prefers explicit ownerUserId", async () => {
      (getUserById as any).mockResolvedValue({ id: 42 });
      await expect(
        resolveAdminRestaurantOwnerUserId({ ownerUserId: 42, adminUserId: 1 })
      ).resolves.toBe(42);
    });

    it("resolves owner from ownerEmail", async () => {
      (getUserByEmail as any).mockResolvedValue({ id: 55, email: "sub@test.com" });
      await expect(
        resolveAdminRestaurantOwnerUserId({
          ownerEmail: "sub@test.com",
          adminUserId: 1,
        })
      ).resolves.toBe(55);
    });

    it("falls back to admin when no owner specified", async () => {
      await expect(
        resolveAdminRestaurantOwnerUserId({ adminUserId: 1 })
      ).resolves.toBe(1);
    });
  });

  describe("assertRestaurantSubscriptionForUpdate", () => {
    it("throws NOT_FOUND when subscription missing", async () => {
      (getSubscriptionById as any).mockResolvedValue(undefined);
      await expect(assertRestaurantSubscriptionForUpdate(99)).rejects.toThrow(TRPCError);
    });
  });

  describe("assertSubscriptionEligibleForAdminInvoice", () => {
    it("blocks trial subscriptions", () => {
      expect(() => assertSubscriptionEligibleForAdminInvoice("trial")).toThrow(TRPCError);
    });

    it("allows active subscriptions", () => {
      expect(() => assertSubscriptionEligibleForAdminInvoice("active")).not.toThrow();
    });
  });

  describe("applyAdminTrialStatusUpdate", () => {
    it("populates trialEndsAt from subscriptionEndDate", () => {
      const updateData: Record<string, unknown> = {};
      applyAdminTrialStatusUpdate(updateData, {
        status: "trial",
        subscriptionEndDate: "2027-01-15",
      });
      expect(updateData.trialEndsAt).toBe(new Date("2027-01-15").toISOString());
    });
  });
});
