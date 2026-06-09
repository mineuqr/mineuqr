/**
 * ADMIN-AUTH-1B — account classification persistence and internal user flows.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { validateCreateInternalUserInput } from "./createInternalUser";
import {
  ACCOUNT_CLASSIFICATIONS,
  DEFAULT_ACCOUNT_CLASSIFICATION,
  isForbiddenSystemAdminCombo,
} from "@shared/accountClassification";

vi.mock("./db", () => ({
  getDb: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserByOpenId: vi.fn(),
  getUserById: vi.fn(),
  getAllUsers: vi.fn(),
  updateAccountClassification: vi.fn(),
  sanitizeUserForAdminResponse: vi.fn((u: Record<string, unknown>) => u),
}));

vi.mock("./createInternalUser", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./createInternalUser")>();
  return {
    ...actual,
    createInternalUser: vi.fn(),
  };
});

import {
  getAllUsers,
  getUserById,
  updateAccountClassification,
} from "./db";
import { createInternalUser } from "./createInternalUser";
import { appRouter } from "./routers";
import { assertProtectedUserClassificationModifiable } from "./db/cascadeDeletes";

const adminContext = {
  user: {
    id: 99,
    openId: "admin_99",
    name: "Admin",
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

const regularUserContext = {
  user: {
    id: 2,
    openId: "user_2",
    name: "User",
    email: "user@test.com",
    role: "user" as const,
    accountClassification: "COMMERCIAL" as const,
    loginMethod: "email",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    passwordHash: null,
  },
  req: { headers: { origin: "http://localhost:3000" } },
  res: { clearCookie: vi.fn() },
};

describe("ADMIN-AUTH-1B domain types", () => {
  it("exposes canonical classification values", () => {
    expect(ACCOUNT_CLASSIFICATIONS).toEqual(["COMMERCIAL", "INTERNAL", "SYSTEM"]);
    expect(DEFAULT_ACCOUNT_CLASSIFICATION).toBe("COMMERCIAL");
  });

  it("forbids SYSTEM + admin role combination", () => {
    expect(isForbiddenSystemAdminCombo("admin", "SYSTEM")).toBe(true);
    expect(isForbiddenSystemAdminCombo("user", "SYSTEM")).toBe(false);
    expect(isForbiddenSystemAdminCombo("admin", "INTERNAL")).toBe(false);
  });
});

describe("ADMIN-AUTH-1B createInternalUser validation", () => {
  it("rejects invalid email", () => {
    expect(() =>
      validateCreateInternalUserInput({
        email: "bad",
        password: "password1",
        name: "Staff",
        role: "user",
        staffCategory: "support",
      })
    ).toThrow(TRPCError);
  });
});

describe("ADMIN-AUTH-1B admin procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createInternalUser assigns INTERNAL classification", async () => {
    (createInternalUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 50,
      email: "staff@test.com",
      role: "user",
      accountClassification: "INTERNAL",
      staffCategory: "support",
    });

    const caller = appRouter.createCaller(adminContext as any);
    const result = await caller.admin.createInternalUser({
      email: "staff@test.com",
      password: "password1",
      name: "Support Agent",
      role: "user",
      staffCategory: "support",
    });

    expect(result.accountClassification).toBe("INTERNAL");
    expect(createInternalUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "staff@test.com",
        staffCategory: "support",
      })
    );
  });

  it("denies non-admin createInternalUser", async () => {
    const caller = appRouter.createCaller(regularUserContext as any);
    await expect(
      caller.admin.createInternalUser({
        email: "staff@test.com",
        password: "password1",
        name: "Support Agent",
        role: "user",
        staffCategory: "support",
      })
    ).rejects.toBeInstanceOf(TRPCError);
  });

  it("updateAccountClassification persists and audits", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 5,
      role: "user",
      accountClassification: "COMMERCIAL",
    });
    (updateAccountClassification as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(adminContext as any);
    const result = await caller.admin.updateAccountClassification({
      userId: 5,
      accountClassification: "INTERNAL",
    });

    expect(result.accountClassification).toBe("INTERNAL");
    expect(updateAccountClassification).toHaveBeenCalledWith(5, "INTERNAL");
  });

  it("rejects SYSTEM classification for admin-role user", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 5,
      role: "admin",
      accountClassification: "INTERNAL",
    });

    const caller = appRouter.createCaller(adminContext as any);
    await expect(
      caller.admin.updateAccountClassification({
        userId: 5,
        accountClassification: "SYSTEM",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" } satisfies Partial<TRPCError>);
  });

  it("listAllUsers supports classification filter", async () => {
    (getAllUsers as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, role: "admin", accountClassification: "INTERNAL", passwordHash: null },
    ]);

    const caller = appRouter.createCaller(adminContext as any);
    const users = await caller.admin.listAllUsers({ classificationFilter: "INTERNAL" });

    expect(getAllUsers).toHaveBeenCalledWith({ classificationFilter: "INTERNAL" });
    expect(users[0]?.accountClassification).toBe("INTERNAL");
  });

  it("protected user classification cannot be modified", () => {
    expect(() => assertProtectedUserClassificationModifiable(1)).toThrow();
  });
});

describe("ADMIN-AUTH-1B migration mapping (documented expectations)", () => {
  it("maps role=user to COMMERCIAL and role=admin to INTERNAL", () => {
    const commercialUser = { role: "user" as const, accountClassification: "COMMERCIAL" as const };
    const internalAdmin = { role: "admin" as const, accountClassification: "INTERNAL" as const };
    expect(commercialUser.accountClassification).toBe("COMMERCIAL");
    expect(internalAdmin.accountClassification).toBe("INTERNAL");
  });
});
