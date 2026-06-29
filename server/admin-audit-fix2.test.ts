import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./db", () => ({
  generateOrderNumber: vi.fn(async () => "ORD-MOCK-001"),
  getCanonicalUserSubscription: vi.fn(),
  getUserById: vi.fn(),
  getUserByEmail: vi.fn(),
  getSubscriptionPlanById: vi.fn(),
  getSubscriptionById: vi.fn(),
  createInvoice: vi.fn(),
  updateInvoice: vi.fn(),
  createRestaurant: vi.fn(),
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

import { createRestaurant, getAllUsers, getUserByEmail, getUserById } from "./db";
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
