import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { EMAIL_NOT_VERIFIED_ERR_MSG } from "@shared/const";
import type { TrpcContext } from "./_core/context";
import type { SelectUser } from "../drizzle/schema";

vi.mock("./db", () => ({
  generateOrderNumber: vi.fn(async () => "ORD-MOCK-001"),
  getRestaurantsByUser: vi.fn(async () => []),
  getRestaurantById: vi.fn(async (id: number) =>
    id === 1
      ? {
          id: 1,
          userId: 10,
          slug: "test-slug",
          nameAr: "مطعم",
          nameEn: null,
          isActive: true,
        }
      : null
  ),
  createRestaurant: vi.fn(async () => ({ id: 2 })),
  updateRestaurant: vi.fn(async () => undefined),
  deleteRestaurantCascade: vi.fn(async () => undefined),
  updateUserProfile: vi.fn(async () => undefined),
  updateUserPassword: vi.fn(async () => undefined),
  getUserByEmail: vi.fn(async () => undefined),
  isSubscriptionActive: vi.fn(async () => true),
  getTrialEndDate: vi.fn(async () => new Date(Date.now() + 86400000)),
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
  putUploadedFile: vi.fn(async () => ({ url: "https://example.com/logo.png" })),
}));

vi.mock("./owner-email-notifications", () => ({
  notifyOwnerNewRestaurant: vi.fn(async () => true),
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

function createContext(user: SelectUser): TrpcContext {
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

describe("restaurant + profile verifiedProcedure (AUTH-POLICY-1B.4 Phase B)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    delete process.env.AUTH_REQUIRE_VERIFIED_EMAIL;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("AUTH_REQUIRE_VERIFIED_EMAIL off", () => {
    it("allows unverified local user on restaurant.create", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      const result = await caller.restaurant.create({ nameAr: "جديد" });
      expect(result.id).toBe(2);
    });

    it("allows unverified local user on profile.update", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expect(
        caller.profile.update({ name: "Updated" })
      ).resolves.toEqual({ success: true });
    });

    it("allows unverified local user to read restaurant.list", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expect(caller.restaurant.list()).resolves.toEqual([]);
    });
  });

  describe("AUTH_REQUIRE_VERIFIED_EMAIL on", () => {
    beforeEach(() => {
      vi.stubEnv("AUTH_REQUIRE_VERIFIED_EMAIL", "1");
    });

    it("blocks unverified local user on restaurant.create", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expectForbiddenUnverified(() =>
        caller.restaurant.create({ nameAr: "جديد" })
      );
    });

    it("blocks unverified local user on restaurant.update", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expectForbiddenUnverified(() =>
        caller.restaurant.update({ id: 1, nameAr: "تعديل" })
      );
    });

    it("blocks unverified local user on restaurant.updateTemplate", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expectForbiddenUnverified(() =>
        caller.restaurant.updateTemplate({ id: 1, menuTemplate: "classic" })
      );
    });

    it("blocks unverified local user on profile.update", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expectForbiddenUnverified(() =>
        caller.profile.update({ name: "Updated" })
      );
    });

    it("blocks unverified local user on profile.changePassword", async () => {
      const hash = await bcrypt.hash("OldPass1!", 12);
      const caller = appRouter.createCaller(
        createContext(baseUser({ passwordHash: hash }))
      );
      await expectForbiddenUnverified(() =>
        caller.profile.changePassword({
          currentPassword: "OldPass1!",
          newPassword: "NewPass2!",
        })
      );
    });

    it("allows verified local user on restaurant.update", async () => {
      const caller = appRouter.createCaller(
        createContext(baseUser({ emailVerifiedAt: new Date().toISOString() }))
      );
      await expect(
        caller.restaurant.update({ id: 1, nameAr: "تعديل" })
      ).resolves.toEqual({ success: true });
    });

    it("allows verified local user on profile.update", async () => {
      const caller = appRouter.createCaller(
        createContext(baseUser({ emailVerifiedAt: new Date().toISOString() }))
      );
      await expect(
        caller.profile.update({ name: "Verified" })
      ).resolves.toEqual({ success: true });
    });

    it("allows admin bypass on restaurant.create", async () => {
      const caller = appRouter.createCaller(
        createContext(baseUser({ role: "admin", emailVerifiedAt: null }))
      );
      const result = await caller.restaurant.create({ nameAr: "admin" });
      expect(result.id).toBe(2);
    });

    it("allows OAuth user on restaurant.create", async () => {
      const caller = appRouter.createCaller(
        createContext(baseUser({ loginMethod: "manus", emailVerifiedAt: null }))
      );
      const result = await caller.restaurant.create({ nameAr: "oauth" });
      expect(result.id).toBe(2);
    });

    it("does not block restaurant.list for unverified local user", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expect(caller.restaurant.list()).resolves.toEqual([]);
    });

    it("does not block profile.get for unverified local user", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      const profile = await caller.profile.get();
      expect(profile.emailVerifiedAt).toBeNull();
    });

    it("throws TRPCError FORBIDDEN (not internal error)", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      try {
        await caller.restaurant.delete({ id: 1 });
        expect.fail("expected throw");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("FORBIDDEN");
      }
    });
  });
});
