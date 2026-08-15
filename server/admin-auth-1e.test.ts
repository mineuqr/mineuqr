/**
 * ADMIN-AUTH-1E — platform account subscription protection.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { UserSubscriptionRow } from "./subscriptionResolver";

const { PLATFORM_OPEN_ID } = vi.hoisted(() => ({
  PLATFORM_OPEN_ID: "platform_owner_open_id",
}));

vi.mock("./_core/env", () => ({
  ENV: {
    ownerOpenId: PLATFORM_OPEN_ID,
  },
}));

vi.mock("./db", () => ({
  generateOrderNumber: vi.fn(async () => "ORD-MOCK-001"),
  getSubscriptionsByUser: vi.fn(),
  getUserById: vi.fn(),
  getSubscriptionPlanById: vi.fn(),
  getSubscriptionPlans: vi.fn(),
  getRestaurantsByUser: vi.fn(async () => []),
  createSubscriptionForRestaurant: vi.fn(),
  updateSubscriptionById: vi.fn(),
  createNotification: vi.fn(),
  createInvoice: vi.fn(),
  updateInvoice: vi.fn(),
}));

vi.mock("./db/cascadeDeletes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db/cascadeDeletes")>();
  return {
    ...actual,
    deleteSubscriptionCascade: vi.fn(),
  };
});

vi.mock("./local-uploads", () => ({
  putUploadedFile: vi.fn(async () => ({ url: "https://example.com/invoice.pdf" })),
}));

vi.mock("./invoice-pdf", () => ({
  generateInvoicePDFBuffer: vi.fn(async () => Buffer.from("pdf")),
}));

import {
  createSubscriptionForRestaurant,
  getSubscriptionsByUser,
  getUserById,
  getSubscriptionPlanById,
  updateSubscriptionById,
} from "./db";
import { deleteSubscriptionCascade } from "./db/cascadeDeletes";
import { appRouter } from "./routers";

const PLATFORM_USER_ID = 1;
const OTHER_USER_ID = 5;

const platformUser = {
  id: PLATFORM_USER_ID,
  openId: PLATFORM_OPEN_ID,
  name: "Platform Owner",
  email: "owner@mineuqr.com",
  role: "admin" as const,
  accountClassification: "INTERNAL" as const,
  loginMethod: "email",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
  passwordHash: null,
};

const otherUser = {
  id: OTHER_USER_ID,
  openId: "user_5",
  name: "Customer",
  email: "customer@test.com",
  role: "user" as const,
  accountClassification: "COMMERCIAL" as const,
  loginMethod: "email",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
  passwordHash: null,
};

const adminContext = {
  user: {
    id: 99,
    openId: "admin_99",
    name: "Other Admin",
    email: "admin@test.com",
    role: "admin" as const,
    accountClassification: "INTERNAL" as const,
    loginMethod: "email",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    passwordHash: null,
  },
  req: { headers: { origin: "http://localhost:3000" } },
  res: { clearCookie: vi.fn() },
};

function accountSub(
  overrides: Partial<UserSubscriptionRow> & Pick<UserSubscriptionRow, "id" | "userId">
): UserSubscriptionRow {
  return {
    restaurantId: 0,
    planId: 30002,
    status: "active",
    billingCycle: "monthly",
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    trialEndsAt: null,
    canceledAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function setupUsers() {
  (getUserById as ReturnType<typeof vi.fn>).mockImplementation(async (id: number) => {
    if (id === platformUser.id) return platformUser;
    if (id === otherUser.id) return otherUser;
    if (id === adminContext.user.id) return adminContext.user;
    return null;
  });
}

function setupPlatformSubscription() {
  (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockImplementation(async (userId: number) =>
    userId === PLATFORM_USER_ID
      ? [accountSub({ id: 100, userId: PLATFORM_USER_ID })]
      : []
  );
}

describe("ADMIN-AUTH-1E platform subscription protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUsers();
    setupPlatformSubscription();
    (getSubscriptionPlanById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 30002,
      nameEn: "Plan",
      nameAr: "باقة",
      priceMonthly: "39.00",
      priceYearly: "390.00",
    });
    (createSubscriptionForRestaurant as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 200 });
    (updateSubscriptionById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (deleteSubscriptionCascade as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("cannot_create_subscription_for_platform_account", async () => {
    const caller = appRouter.createCaller(adminContext as any);
    await expect(
      caller.admin.createUserSubscriptionByAdmin({
        userId: PLATFORM_USER_ID,
        planId: "11111111-1111-4111-8111-111111111111",
        billingCycle: "monthly",
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    } satisfies Partial<TRPCError>);
    expect(createSubscriptionForRestaurant).not.toHaveBeenCalled();
  });

  it("cannot_update_subscription_for_platform_account", async () => {
    const caller = appRouter.createCaller(adminContext as any);
    await expect(
      caller.admin.updateUserSubscriptionByAdmin({
        userId: PLATFORM_USER_ID,
        status: "canceled",
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    } satisfies Partial<TRPCError>);
    expect(updateSubscriptionById).not.toHaveBeenCalled();
  });

  it("cannot_delete_subscription_for_platform_account", async () => {
    const caller = appRouter.createCaller(adminContext as any);
    await expect(
      caller.admin.deleteUserSubscriptionByAdmin({
        userId: PLATFORM_USER_ID,
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    } satisfies Partial<TRPCError>);
    expect(deleteSubscriptionCascade).not.toHaveBeenCalled();
  });

  it("cannot_generate_invoice_for_platform_account", async () => {
    const caller = appRouter.createCaller(adminContext as any);
    await expect(
      caller.admin.generateInvoicePDF({
        userId: PLATFORM_USER_ID,
        subscriptionId: 100,
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    } satisfies Partial<TRPCError>);
  });

  it("allows subscription mutations for non-platform users", async () => {
    (getSubscriptionsByUser as ReturnType<typeof vi.fn>).mockImplementation(async (userId: number) =>
      userId === OTHER_USER_ID ? [accountSub({ id: 101, userId: OTHER_USER_ID })] : []
    );

    const caller = appRouter.createCaller(adminContext as any);
    await expect(
      caller.admin.updateUserSubscriptionByAdmin({
        userId: OTHER_USER_ID,
        status: "canceled",
      })
    ).resolves.toMatchObject({ success: true });
    expect(updateSubscriptionById).toHaveBeenCalled();
  });
});
