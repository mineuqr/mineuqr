import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { EMAIL_NOT_VERIFIED_ERR_MSG } from "@shared/const";
import type { TrpcContext } from "./_core/context";
import type { SelectUser } from "../drizzle/schema";

vi.mock("./db", () => ({
  generateOrderNumber: vi.fn(async () => "ORD-MOCK-001"),
  getSubscriptionPlans: vi.fn(async () => []),
  getUserSubscription: vi.fn(async () => null),
  getCanonicalUserSubscription: vi.fn(async () => null),
  getSubscriptionPlanById: vi.fn(async () => null),
  getUserById: vi.fn(async (userId: number) => ({
    id: userId,
    role: "user",
  })),
  getSubscriptionsByUser: vi.fn(async () => []),
  isSubscriptionActive: vi.fn(async () => false),
  getTrialEndDate: vi.fn(async () => null),
  getInvoicesByUser: vi.fn(async () => []),
  getInvoiceById: vi.fn(async () => null),
  getUnpaidInvoices: vi.fn(async () => []),
  getRestaurantById: vi.fn(async () => null),
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

describe("subscription + invoice verifiedProcedure (AUTH-POLICY-1B.3 Phase A)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    delete process.env.AUTH_REQUIRE_VERIFIED_EMAIL;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("AUTH_REQUIRE_VERIFIED_EMAIL off", () => {
    it("allows unverified local user on subscription.getCurrentSubscription", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expect(caller.subscription.getCurrentSubscription()).resolves.toBeNull();
    });

    it("allows unverified local user on invoice.list", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expect(caller.invoice.list()).resolves.toEqual([]);
    });
  });

  describe("AUTH_REQUIRE_VERIFIED_EMAIL on", () => {
    beforeEach(() => {
      vi.stubEnv("AUTH_REQUIRE_VERIFIED_EMAIL", "1");
    });

    it("blocks unverified local user on subscription.getCurrentSubscription", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expectForbiddenUnverified(() =>
        caller.subscription.getCurrentSubscription()
      );
    });

    it("blocks unverified local user on subscription.checkTrialStatus", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expectForbiddenUnverified(() => caller.subscription.checkTrialStatus());
    });

    it("blocks unverified local user on subscription.createCheckoutSession", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expectForbiddenUnverified(() =>
        caller.subscription.createCheckoutSession({
          planId: 1,
          billingCycle: "monthly",
        })
      );
    });

    it("blocks unverified local user on invoice.list", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      await expectForbiddenUnverified(() => caller.invoice.list());
    });

    it("allows verified local user on subscription.getCurrentSubscription", async () => {
      const caller = appRouter.createCaller(
        createContext(
          baseUser({ emailVerifiedAt: new Date().toISOString() })
        )
      );
      await expect(caller.subscription.getCurrentSubscription()).resolves.toBeNull();
    });

    it("allows verified local user on invoice.getUnpaid", async () => {
      const caller = appRouter.createCaller(
        createContext(
          baseUser({ emailVerifiedAt: new Date().toISOString() })
        )
      );
      await expect(caller.invoice.getUnpaid()).resolves.toEqual([]);
    });

    it("allows admin bypass on invoice.list", async () => {
      const caller = appRouter.createCaller(
        createContext(baseUser({ role: "admin", emailVerifiedAt: null }))
      );
      await expect(caller.invoice.list()).resolves.toEqual([]);
    });

    it("allows provider-trusted OAuth user on subscription.checkTrialStatus", async () => {
      const caller = appRouter.createCaller(
        createContext(
          baseUser({ loginMethod: "manus", emailVerifiedAt: null })
        )
      );
      await expect(caller.subscription.checkTrialStatus()).resolves.toEqual({
        isActive: false,
        trialEndDate: null,
      });
    });

    it("throws TRPCError FORBIDDEN (not internal error)", async () => {
      const caller = appRouter.createCaller(createContext(baseUser()));
      try {
        await caller.invoice.getById({ id: 1 });
        expect.fail("expected throw");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError).code).toBe("FORBIDDEN");
      }
    });
  });
});
