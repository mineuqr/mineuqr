import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("./db", () => ({
  getCanonicalUserSubscription: vi.fn(),
  getUserById: vi.fn(),
  getSubscriptionPlanById: vi.fn(),
  createInvoice: vi.fn(),
  updateInvoice: vi.fn(),
  createSubscriptionForRestaurant: vi.fn(),
  getRestaurantById: vi.fn(),
  createNotification: vi.fn(),
}));

vi.mock("./local-uploads", () => ({
  putUploadedFile: vi.fn(async () => ({ url: "https://example.com/invoice.pdf" })),
}));

vi.mock("./invoice-pdf", () => ({
  generateInvoicePDFBuffer: vi.fn(async () => Buffer.from("pdf")),
}));

import {
  getCanonicalUserSubscription,
  getUserById,
  getSubscriptionPlanById,
  createInvoice,
  updateInvoice,
  createSubscriptionForRestaurant,
  getRestaurantById,
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
      (getUserById as any).mockResolvedValue({ id: 5, name: "User", email: "user@test.com" });
      (getCanonicalUserSubscription as any).mockResolvedValue({
        id: 10,
        userId: 5,
        planId: 1,
        status: "active",
        billingCycle: "monthly",
      });
      (getSubscriptionPlanById as any).mockResolvedValue({
        id: 1,
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
      (getUserById as any).mockResolvedValue({ id: 5, name: "User", email: "user@test.com" });
      (getCanonicalUserSubscription as any).mockResolvedValue({
        id: 10,
        userId: 5,
        planId: 1,
        status: "active",
        billingCycle: "monthly",
      });
      (getSubscriptionPlanById as any).mockResolvedValue({
        id: 1,
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
      (getUserById as any).mockResolvedValue({ id: 5, name: "Trial User", email: "trial@test.com" });
      (getCanonicalUserSubscription as any).mockResolvedValue({
        id: 10,
        userId: 5,
        planId: 1,
        status: "trial",
        billingCycle: "monthly",
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
  });

  describe("createUserSubscriptionByAdmin", () => {
    it("does not auto-create invoices for trial subscriptions", async () => {
      (getCanonicalUserSubscription as any).mockResolvedValue(null);
      (getRestaurantById as any).mockResolvedValue({ id: 3, userId: 7 });
      (createSubscriptionForRestaurant as any).mockResolvedValue({ id: 99 });
      (getSubscriptionPlanById as any).mockResolvedValue({
        id: 1,
        nameAr: "باقة",
        nameEn: "Plan",
        priceMonthly: "39",
      });
      (createNotification as any).mockResolvedValue(undefined);

      const caller = createCaller();
      const result = await caller.admin.createUserSubscriptionByAdmin({
        userId: 7,
        restaurantId: 3,
        planId: 1,
        billingCycle: "monthly",
        status: "trial",
      });

      expect(result).toEqual({ success: true, subscriptionId: 99 });
      expect(createInvoice).not.toHaveBeenCalled();
    });
  });
});
