/**
 * ADMIN-SECURITY-CENTER PR-9 — profile.* governance deprecation wiring tests.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const logDeprecatedApiUsedMock = vi.hoisted(() => vi.fn());

vi.mock("./deprecatedApiAudit", () => ({
  logDeprecatedApiUsed: (...args: unknown[]) => logDeprecatedApiUsedMock(...args),
  DEPRECATED_PROFILE_GOVERNANCE_APIS: {
    "profile.listAllUsers": "admin.listAllUsers",
    "profile.updateUserRole": "admin.updateUserRole",
    "profile.deleteUser": "admin.deleteUser",
  },
  getDeprecatedApiReplacement: (p: string) =>
    ({
      "profile.listAllUsers": "admin.listAllUsers",
      "profile.updateUserRole": "admin.updateUserRole",
      "profile.deleteUser": "admin.deleteUser",
    })[p],
}));

vi.mock("./db", () => ({
  getAllUsers: vi.fn(async () => [
    {
      id: 1,
      openId: "u1",
      name: "User",
      email: "u@test.com",
      role: "user",
      accountClassification: "COMMERCIAL",
    },
  ]),
  sanitizeUserForAdminResponse: vi.fn((u: Record<string, unknown>) => u),
  getUserById: vi.fn(),
  updateUserRole: vi.fn(),
}));

import { getAllUsers } from "./db";
import { appRouter } from "./routers";

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
    emailVerifiedAt: new Date(),
  },
  correlationId: "corr-pr9-profile",
  req: { headers: {} },
  res: { clearCookie: vi.fn() },
};

describe("deprecated profile governance APIs PR-9", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("profile.listAllUsers emits deprecated_api_used before returning data", async () => {
    const caller = appRouter.createCaller(adminContext as any);
    const users = await caller.profile.listAllUsers();

    expect(users).toHaveLength(1);
    expect(getAllUsers).toHaveBeenCalled();
    expect(logDeprecatedApiUsedMock).toHaveBeenCalledWith(
      adminContext,
      "profile.listAllUsers"
    );
  });
});
