import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./db", () => ({
  generateOrderNumber: vi.fn(async () => "ORD-MOCK-001"),
  getSubscriptionsByUser: vi.fn(),
  getUserById: vi.fn(),
  getSubscriptionPlanById: vi.fn(),
  getSubscriptionPlans: vi.fn(),
  getRestaurantsByUser: vi.fn(async () => []),
  createInvoice: vi.fn(),
  updateInvoice: vi.fn(),
  createSubscriptionForRestaurant: vi.fn(),
  deleteUserSubscriptionById: vi.fn(),
  getRestaurantById: vi.fn(),
  createNotification: vi.fn(),
}));

vi.mock("./services/commercial-catalog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./services/commercial-catalog")>();
  return {
    ...actual,
    getSubscriptionCommercialBinding: vi.fn(async () => ({
      subscriptionId: 10,
      planId: "live-pro",
      chargedAmount: "39.00",
      chargedCurrency: "USD",
      billingCycleId: null,
      billingCycleCode: "monthly",
      legacyPlanId: 30002,
      createdAt: new Date().toISOString(),
    })),
    resolveLivePlanDisplayByLegacyId: vi.fn(async (id: number) => ({
      id,
      nameEn: "Plan",
      nameAr: "باقة",
    })),
    resolveLivePlanDisplayByPlanRef: vi.fn(async () => ({
      id: 0,
      nameEn: "Plan",
      nameAr: "باقة",
    })),
    resolveCanonicalLivePlanId: vi.fn(async () => "11111111-1111-4111-8111-111111111111"),
    resolveLivePlanById: vi.fn(async () => "11111111-1111-4111-8111-111111111111"),
    resolveLegacyPlanIdFromPlan: vi.fn(() => 30002),
  };
});

vi.mock("./commercial/adminChargedTermsCompletion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./commercial/adminChargedTermsCompletion")>();
  return {
    ...actual,
    resolveChargedTermsForAdminCreate: vi.fn(async () => ({
      planId: "11111111-1111-4111-8111-111111111111",
      catalogPlanCode: "professional",
      commercialName: "Plan",
      chargedAmount: "39.00",
      chargedCurrency: "USD",
      billingCycleId: "cycle-monthly",
      billingCycleCode: "monthly",
      intervalCount: 1,
      intervalUnit: "month",
    })),
    persistAdminCreateChargedTerms: vi.fn(async () => ({
      planId: "11111111-1111-4111-8111-111111111111",
      chargedTerms: { chargedAmount: "39.00" },
    })),
  };
});

vi.mock("./local-uploads", () => ({
  putUploadedFile: vi.fn(async () => ({ url: "https://example.com/invoice.pdf" })),
}));

vi.mock("./invoice-pdf", () => ({
  generateInvoicePDFBuffer: vi.fn(async () => Buffer.from("pdf")),
}));

import {
  getSubscriptionsByUser,
  getUserById,
  getSubscriptionPlanById,
  getSubscriptionPlans,
  createInvoice,
  updateInvoice,
  createSubscriptionForRestaurant,
  createNotification,
} from "./db";
import { appRouter } from "./routers";

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

function accountSub(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    userId: 5,
    restaurantId: 0,
    planId: 30002,
    status: "active",
    billingCycle: "monthly",
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    trialEndsAt: null,
    canceledAt: null,
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function setupDbForUser(userId: number, subs: ReturnType<typeof accountSub>[]) {
  (getUserById as any).mockImplementation(async (id: number) => {
    if (id === userId) return { id: userId, name: "User", email: "user@test.com", role: "user" };
    if (id === 1) return { ...adminUser };
    return { id, role: "user" };
  });
  (getSubscriptionsByUser as any).mockImplementation(async (uid: number) =>
    uid === userId ? subs : []
  );
  (getSubscriptionPlans as any).mockResolvedValue([]);
}

function createCaller() {
  return appRouter.createCaller({
    user: adminUser,
    req: { headers: { origin: "http://localhost:3000" } } as any,
    res: { clearCookie: vi.fn() } as any,
  });
}

describe("Admin invoice billing hardening (ADMIN-AUDIT-FIX-1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateInvoicePDF", () => {
    it("creates pending invoice by default (ADMIN-AUDIT-FIX-2)", async () => {
      setupDbForUser(5, [accountSub()]);
      (getSubscriptionPlanById as any).mockResolvedValue({
        id: 30002,
        nameEn: "Plan",
        priceMonthly: "39",
      });
      (createInvoice as any).mockResolvedValue({ id: 501 });
      (updateInvoice as any).mockResolvedValue(undefined);

      const caller = createCaller();
      await caller.admin.generateInvoicePDF({ userId: 5, subscriptionId: 10 });

      expect(createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pending",
          paidAt: undefined,
        })
      );
    });

    it("creates paid invoice only when markAsPaid is true", async () => {
      setupDbForUser(5, [accountSub()]);
      (getSubscriptionPlanById as any).mockResolvedValue({
        id: 30002,
        nameEn: "Plan",
        priceMonthly: "39",
      });
      (createInvoice as any).mockResolvedValue({ id: 502 });
      (updateInvoice as any).mockResolvedValue(undefined);

      const caller = createCaller();
      await caller.admin.generateInvoicePDF({
        userId: 5,
        subscriptionId: 10,
        markAsPaid: true,
      });

      expect(createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "paid",
          paidAt: expect.any(String),
        })
      );
    });

    it("rejects trial subscriptions with admin-facing error", async () => {
      setupDbForUser(5, [accountSub({ status: "trial" })]);
      (getSubscriptionPlanById as any).mockResolvedValue({
        id: 30002,
        nameEn: "Plan",
        priceMonthly: "39",
      });

      const caller = createCaller();
      await expect(
        caller.admin.generateInvoicePDF({ userId: 5, subscriptionId: 10 })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: expect.stringContaining("تجريبي"),
      } satisfies Partial<TRPCError>);

      expect(createInvoice).not.toHaveBeenCalled();
    });

    it("rejects when subscriptionId does not match account-level row", async () => {
      setupDbForUser(5, [accountSub({ id: 10 })]);
      const caller = createCaller();
      await expect(
        caller.admin.generateInvoicePDF({ userId: 5, subscriptionId: 99 })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      } satisfies Partial<TRPCError>);
    });
  });

  describe("createUserSubscriptionByAdmin", () => {
    it("does not auto-create invoices for trial subscriptions", async () => {
      setupDbForUser(7, []);
      (createSubscriptionForRestaurant as any).mockResolvedValue({ id: 99 });
      (getSubscriptionPlanById as any).mockResolvedValue({
        id: 30002,
        nameAr: "باقة",
        nameEn: "Plan",
        priceMonthly: "39",
      });
      (createNotification as any).mockResolvedValue(undefined);

      const caller = createCaller();
      const result = await caller.admin.createUserSubscriptionByAdmin({
        userId: 7,
        planId: "11111111-1111-4111-8111-111111111111",
        billingCycle: "monthly",
        status: "trial",
      });

      expect(result).toEqual({ success: true, subscriptionId: 99 });
      expect(createInvoice).not.toHaveBeenCalled();
      expect(createSubscriptionForRestaurant).toHaveBeenCalledWith(
        expect.objectContaining({ restaurantId: 0, userId: 7 })
      );
    });
  });
});
