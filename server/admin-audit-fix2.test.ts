import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./db", () => ({
  getCanonicalUserSubscription: vi.fn(),
  getUserById: vi.fn(),
  getUserByEmail: vi.fn(),
  getSubscriptionPlanById: vi.fn(),
  getSubscriptionById: vi.fn(),
  createInvoice: vi.fn(),
  updateInvoice: vi.fn(),
  createRestaurant: vi.fn(),
  createSubscriptionForRestaurant: vi.fn(),
  getRestaurantById: vi.fn(),
  getSubscriptionForRestaurant: vi.fn(),
  updateSubscriptionById: vi.fn(),
  getAllUsers: vi.fn(),
  sanitizeUserForAdminResponse: vi.fn((user: { passwordHash?: string | null; id: number }) => {
    const { passwordHash: _removed, ...safe } = user;
    return safe;
  }),
}));

vi.mock("./local-uploads", () => ({
  putUploadedFile: vi.fn(async () => ({ url: "https://example.com/invoice.pdf" })),
}));

vi.mock("./invoice-pdf", () => ({
  generateInvoicePDFBuffer: vi.fn(async () => Buffer.from("pdf")),
}));

vi.mock("./owner-email-notifications", () => ({
  notifyOwnerNewRestaurant: vi.fn(async () => undefined),
}));

import {
  createRestaurant,
  createSubscriptionForRestaurant,
  getAllUsers,
  getRestaurantById,
  getSubscriptionById,
  getSubscriptionForRestaurant,
  getUserByEmail,
  getUserById,
  createInvoice,
  updateSubscriptionById,
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

function createCaller(user = adminUser) {
  return appRouter.createCaller({
    user,
    req: { headers: { origin: "http://localhost:3000" } } as any,
    res: { clearCookie: vi.fn() } as any,
  });
}

describe("Admin operations hardening (ADMIN-AUDIT-FIX-2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("restaurant.create ownership (R-1)", () => {
    it("assigns restaurant to subscriber via ownerUserId when admin creates", async () => {
      (getUserById as any).mockResolvedValue({
        id: 42,
        name: "Subscriber",
        email: "sub@test.com",
      });
      (createRestaurant as any).mockResolvedValue({ id: 99 });

      const caller = createCaller();
      const result = await caller.restaurant.create({
        nameAr: "مطعم",
        ownerUserId: 42,
        ownerEmail: "sub@test.com",
      });

      expect(result.id).toBe(99);
      expect(createRestaurant).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 42,
          ownerEmail: "sub@test.com",
        })
      );
    });

    it("resolves subscriber from ownerEmail when ownerUserId omitted", async () => {
      (getUserByEmail as any).mockResolvedValue({
        id: 55,
        name: "Email Sub",
        email: "owner@test.com",
      });
      (createRestaurant as any).mockResolvedValue({ id: 100 });

      const caller = createCaller();
      await caller.restaurant.create({
        nameAr: "مطعم",
        ownerEmail: "owner@test.com",
      });

      expect(createRestaurant).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 55 })
      );
    });

    it("creates subscription for restaurant owner after onboarding", async () => {
      (getRestaurantById as any).mockResolvedValue({ id: 3, userId: 42 });
      (getSubscriptionForRestaurant as any).mockResolvedValue(undefined);
      (createSubscriptionForRestaurant as any).mockResolvedValue({ id: 77 });

      const caller = createCaller();
      const result = await caller.admin.createRestaurantSubscription({
        restaurantId: 3,
        planId: 1,
        billingCycle: "monthly",
      });

      expect(result.subscriptionId).toBe(77);
      expect(createSubscriptionForRestaurant).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 42, restaurantId: 3 })
      );
    });
  });

  describe("updateRestaurantSubscription validation (R-2)", () => {
    it("returns NOT_FOUND for missing subscription", async () => {
      (getSubscriptionById as any).mockResolvedValue(undefined);

      const caller = createCaller();
      await expect(
        caller.admin.updateRestaurantSubscription({ subscriptionId: 999, status: "active" })
      ).rejects.toMatchObject({ code: "NOT_FOUND" } satisfies Partial<TRPCError>);

      expect(updateSubscriptionById).not.toHaveBeenCalled();
    });

    it("rejects when subscription owner does not match restaurant owner", async () => {
      (getSubscriptionById as any).mockResolvedValue({
        id: 10,
        userId: 5,
        restaurantId: 3,
      });
      (getRestaurantById as any).mockResolvedValue({ id: 3, userId: 99 });

      const caller = createCaller();
      await expect(
        caller.admin.updateRestaurantSubscription({ subscriptionId: 10, status: "active" })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" } satisfies Partial<TRPCError>);

      expect(updateSubscriptionById).not.toHaveBeenCalled();
    });

    it("updates when subscription and restaurant are consistent", async () => {
      (getSubscriptionById as any).mockResolvedValue({
        id: 10,
        userId: 5,
        restaurantId: 3,
      });
      (getRestaurantById as any).mockResolvedValue({ id: 3, userId: 5 });
      (updateSubscriptionById as any).mockResolvedValue(undefined);

      const caller = createCaller();
      await expect(
        caller.admin.updateRestaurantSubscription({ subscriptionId: 10, status: "active" })
      ).resolves.toEqual({ success: true });

      expect(updateSubscriptionById).toHaveBeenCalledWith(10, { status: "active" });
    });
  });

  describe("passwordHash stripping (R-3)", () => {
    it("does not return passwordHash from admin.listAllUsers", async () => {
      (getAllUsers as any).mockResolvedValue([
        {
          id: 2,
          openId: "u2",
          name: "User",
          email: "u@test.com",
          role: "user",
          loginMethod: "email",
          passwordHash: "$2a$12$secret",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastSignedIn: new Date().toISOString(),
        },
      ]);

      const caller = createCaller();
      const users = await caller.admin.listAllUsers();

      expect(users[0]).not.toHaveProperty("passwordHash");
      expect(users[0]?.id).toBe(2);
    });
  });
});
