/**
 * AUTHORITY-CLEANUP-1 — subscription authority unification validation.
 * Scenarios A/B/C from AUTHORITY-CLEANUP-1 spec.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { UserSubscriptionRow } from "../subscriptionResolver";
import {
  getOwnerAccountSubscriptionRow,
  ownerHasEntitledAccountSubscription,
} from "./ownerAccountSubscriptionAuthority";
import { commercialReadService } from "./CommercialReadService";
import { appRouter } from "../routers";
import {
  ensureCatalogReady,
  planService,
} from "../services/commercial-catalog";

async function professionalLivePlanId(): Promise<string> {
  await ensureCatalogReady();
  const plan = planService.getByCode("professional");
  if (!plan) throw new Error("professional live plan missing");
  return plan.id;
}

vi.mock("../db", () => ({
  getDb: vi.fn(async () => null),
  generateOrderNumber: vi.fn(async () => "ORD-MOCK-001"),
  getSubscriptionsByUser: vi.fn(),
  getUserById: vi.fn(),
  getSubscriptionPlanById: vi.fn(),
  getSubscriptionPlans: vi.fn(),
  getRestaurantsByUser: vi.fn(async () => []),
  createSubscriptionForRestaurant: vi.fn(),
  deleteUserSubscriptionById: vi.fn(),
  createNotification: vi.fn(),
  getRestaurantById: vi.fn(),
  createInvoice: vi.fn(),
  updateInvoice: vi.fn(),
}));

vi.mock("./adminChargedTermsCompletion", () => ({
  persistAdminCreateChargedTerms: vi.fn(async () => ({
    planId: "live-professional",
    chargedTerms: { chargedAmount: "79.00" },
  })),
  resolveChargedTermsForAdminCreate: vi.fn(async (input: { planId: string; billingCycleCode: string }) => ({
    planId: input.planId,
    catalogPlanCode: "professional",
    commercialName: "Professional",
    chargedAmount: "79.00",
    chargedCurrency: "USD",
    billingCycleId: "cycle-monthly",
    billingCycleCode: input.billingCycleCode,
    intervalCount: 1,
    intervalUnit: "month",
  })),
  rethrowAdminChargedTermsAsTrpc: (error: unknown) => {
    throw error;
  },
  throwAdminFinancialIncomplete: () => {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "تعذر إكمال الاشتراك: الشروط المالية غير متوفرة.",
    });
  },
  isAdminBillingCycleCode: (value: string) => value === "monthly" || value === "yearly",
  ADMIN_BILLING_CYCLE_CODES: ["monthly", "yearly"],
  ADMIN_FINANCIAL_INCOMPLETE_MESSAGE: "تعذر إكمال الاشتراك: الشروط المالية غير متوفرة.",
}));

import {
  getSubscriptionsByUser,
  getUserById,
  getSubscriptionPlanById,
  getSubscriptionPlans,
  createSubscriptionForRestaurant,
  createNotification,
} from "../db";
import {
  COMMERCIAL_PLAN_CATALOG,
  COMMERCIAL_TEST_NOW,
  commercialTestSubRow,
  installCommercialTestClock,
  isoPlusDaysFromCommercialTestNow,
} from "./__tests__/commercialTestFixtures";

const FIXED_NOW = COMMERCIAL_TEST_NOW;
const USER_ID = 14760004;

const PLAN_CATALOG = {
  30002: COMMERCIAL_PLAN_CATALOG[30002],
};

function subRow(overrides: Parameters<typeof commercialTestSubRow>[0]) {
  return commercialTestSubRow(overrides);
}

function setupPlansMock() {
  (getSubscriptionPlanById as ReturnType<typeof vi.fn>).mockImplementation(
    async (id: number) => PLAN_CATALOG[id as keyof typeof PLAN_CATALOG]
  );
  (getSubscriptionPlans as ReturnType<typeof vi.fn>).mockResolvedValue(
    Object.values(PLAN_CATALOG)
  );
}

function setupUserSubs(rows: UserSubscriptionRow[]) {
  (getUserById as ReturnType<typeof vi.fn>).mockImplementation(async (id: number) => {
    if (id === USER_ID) return { id: USER_ID, role: "user" };
    if (id === 1) return { id: 1, role: "admin" };
    return { id, role: "user" };
  });
  (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockImplementation(
    async (userId: number) => (userId === USER_ID ? rows : [])
  );
}

const adminUser = {
  id: 1,
  openId: "admin_1",
  name: "Admin",
  email: "admin@test.com",
  role: "admin" as const,
  loginMethod: "email",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
  passwordHash: null,
};

function createCaller() {
  return appRouter.createCaller({
    user: adminUser,
    req: { headers: { origin: "http://localhost:3000" } } as any,
    res: { clearCookie: vi.fn() } as any,
  });
}

describe("AUTHORITY-CLEANUP-1 — canonical owner account subscription authority", () => {
  installCommercialTestClock();

  beforeEach(async () => {
    vi.clearAllMocks();
    setupPlansMock();
    await ensureCatalogReady();
  });

  describe("Scenario A — active entitled account", () => {
    beforeEach(async () => {
      const planId = await professionalLivePlanId();
      setupUserSubs([
        subRow({
          id: 660001,
          userId: USER_ID,
          restaurantId: 0,
          planId,
          status: "active",
        }),
      ]);
    });

    it("CRS reports entitled; create guard blocks", async () => {
      const state = await commercialReadService.getOwnerCommercialState(USER_ID, FIXED_NOW);
      expect(state.commercialStatus.isEntitled).toBe(true);
      expect(await ownerHasEntitledAccountSubscription(USER_ID, FIXED_NOW)).toBe(true);

      const caller = createCaller();
      await expect(
        caller.admin.createUserSubscriptionByAdmin({
          userId: USER_ID,
          planId: await professionalLivePlanId(),
          billingCycle: "monthly",
        })
      ).rejects.toMatchObject({
        code: "CONFLICT",
      } satisfies Partial<TRPCError>);
    });

    it("account row resolved for update/delete target", async () => {
      const row = await getOwnerAccountSubscriptionRow(USER_ID, FIXED_NOW);
      expect(row?.id).toBe(660001);
      expect(row?.restaurantId).toBe(0);
    });
  });

  describe("Scenario B — no entitled account", () => {
    beforeEach(() => {
      setupUserSubs([]);
      (createSubscriptionForRestaurant as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 700001 });
      (createNotification as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    });

    it("CRS not entitled; create allowed at account level", async () => {
      const state = await commercialReadService.getOwnerCommercialState(USER_ID, FIXED_NOW);
      expect(state.commercialStatus.isEntitled).toBe(false);
      expect(await ownerHasEntitledAccountSubscription(USER_ID, FIXED_NOW)).toBe(false);

      const caller = createCaller();
      const result = await caller.admin.createUserSubscriptionByAdmin({
        userId: USER_ID,
        planId: await professionalLivePlanId(),
        billingCycle: "monthly",
      });

      expect(result).toEqual({ success: true, subscriptionId: 700001 });
      expect(createSubscriptionForRestaurant).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          restaurantId: 0,
        })
      );
    });

    it("rejects non-zero restaurantId on create", async () => {
      const caller = createCaller();
      await expect(
        caller.admin.createUserSubscriptionByAdmin({
          userId: USER_ID,
          restaurantId: 720002,
          planId: await professionalLivePlanId(),
          billingCycle: "monthly",
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      } satisfies Partial<TRPCError>);
    });
  });

  describe("Scenario C — expired / orphan legacy scoped rows only", () => {
    const scopedActive = subRow({
      id: 600002,
      userId: USER_ID,
      restaurantId: 720006,
      planId: 30002,
      status: "active",
    });
    const scopedExpired = subRow({
      id: 630001,
      userId: USER_ID,
      restaurantId: 720003,
      planId: 30002,
      status: "expired",
      currentPeriodEnd: isoPlusDaysFromCommercialTestNow(-5),
    });

    beforeEach(() => {
      setupUserSubs([scopedActive, scopedExpired]);
      (createSubscriptionForRestaurant as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 700002 });
      (createNotification as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    });

    it("CRS not entitled (no account row); create allowed — no split-brain", async () => {
      const state = await commercialReadService.getOwnerCommercialState(USER_ID, FIXED_NOW);
      expect(state.commercialStatus.isEntitled).toBe(false);
      expect(state.subscriptionId).toBeNull();
      expect(await ownerHasEntitledAccountSubscription(USER_ID, FIXED_NOW)).toBe(false);
      expect(await getOwnerAccountSubscriptionRow(USER_ID, FIXED_NOW)).toBeUndefined();

      const caller = createCaller();
      const result = await caller.admin.createUserSubscriptionByAdmin({
        userId: USER_ID,
        planId: await professionalLivePlanId(),
        billingCycle: "monthly",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("AUTH-1E — retired restaurant-scoped admin APIs", () => {
    it("createRestaurantSubscription returns PRECONDITION_FAILED", async () => {
      const caller = createCaller();
      await expect(
        caller.admin.createRestaurantSubscription({
          restaurantId: 1,
          planId: "11111111-1111-4111-8111-111111111111",
          billingCycle: "monthly",
        })
      ).rejects.toMatchObject({
        code: "PRECONDITION_FAILED",
        message: expect.stringContaining("AUTHORITY-CLEANUP-1"),
      } satisfies Partial<TRPCError>);
    });
  });
});
