/**
 * ADMIN-AUTH-1D — protected platform account (ENV.ownerOpenId).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

const { PLATFORM_OPEN_ID } = vi.hoisted(() => ({
  PLATFORM_OPEN_ID: "platform_owner_open_id",
}));

vi.mock("./_core/env", () => ({
  ENV: {
    ownerOpenId: PLATFORM_OPEN_ID,
  },
}));

vi.mock("./db", () => ({
  getUserById: vi.fn(),
  getUserByEmail: vi.fn(),
  getAllUsers: vi.fn(),
  updateUserRole: vi.fn(),
  updateAccountClassification: vi.fn(),
  sanitizeUserForAdminResponse: vi.fn((u: Record<string, unknown>) => ({
    ...u,
    isProtectedPlatformAccount: u.openId === PLATFORM_OPEN_ID,
  })),
}));

import { getUserById, getUserByEmail, updateUserRole, updateAccountClassification } from "./db";
import {
  isPlatformAccountOpenId,
  isPlatformAccountUser,
  isPlatformAccountUserId,
} from "./platformAccount";
import {
  assertProtectedUserClassificationModifiable,
  assertProtectedUserRoleModifiable,
  assertUserDeletable,
  ProtectedUserDeleteError,
  ProtectedUserModifyError,
} from "./db/cascadeDeletes";
import { appRouter } from "./routers";

const platformUser = {
  id: 1,
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
  id: 5,
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

describe("ADMIN-AUTH-1D platform account detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getUserById as ReturnType<typeof vi.fn>).mockImplementation(async (id: number) => {
      if (id === platformUser.id) return platformUser;
      if (id === otherUser.id) return otherUser;
      return null;
    });
    (getUserByEmail as ReturnType<typeof vi.fn>).mockImplementation(async (email: string) => {
      if (email === platformUser.email) return platformUser;
      if (email === otherUser.email) return otherUser;
      return null;
    });
  });

  it("identifies platform account by ENV.ownerOpenId", () => {
    expect(isPlatformAccountOpenId(PLATFORM_OPEN_ID)).toBe(true);
    expect(isPlatformAccountOpenId("other_open_id")).toBe(false);
    expect(isPlatformAccountUser(platformUser)).toBe(true);
    expect(isPlatformAccountUser(otherUser)).toBe(false);
  });

  it("resolves platform account by user id", async () => {
    expect(await isPlatformAccountUserId(platformUser.id)).toBe(true);
    expect(await isPlatformAccountUserId(otherUser.id)).toBe(false);
  });
});

describe("ADMIN-AUTH-1D server-side protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getUserById as ReturnType<typeof vi.fn>).mockImplementation(async (id: number) => {
      if (id === platformUser.id) return platformUser;
      if (id === otherUser.id) return otherUser;
      return null;
    });
    (updateUserRole as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (updateAccountClassification as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("blocks delete of platform account", async () => {
    await expect(assertUserDeletable(platformUser.id)).rejects.toBeInstanceOf(
      ProtectedUserDeleteError
    );

    const caller = appRouter.createCaller(adminContext as any);
    await expect(caller.admin.deleteUser({ userId: platformUser.id })).rejects.toBeInstanceOf(
      TRPCError
    );
  });

  it("blocks role modification of platform account", async () => {
    await expect(assertProtectedUserRoleModifiable(platformUser.id)).rejects.toBeInstanceOf(
      ProtectedUserModifyError
    );

    const caller = appRouter.createCaller(adminContext as any);
    await expect(
      caller.admin.updateUserRole({ userId: platformUser.id, role: "user" })
    ).rejects.toBeInstanceOf(TRPCError);
    expect(updateUserRole).not.toHaveBeenCalled();
  });

  it("blocks classification modification of platform account", async () => {
    await expect(
      assertProtectedUserClassificationModifiable(platformUser.id)
    ).rejects.toBeInstanceOf(ProtectedUserModifyError);

    const caller = appRouter.createCaller(adminContext as any);
    await expect(
      caller.admin.updateAccountClassification({
        userId: platformUser.id,
        accountClassification: "COMMERCIAL",
      })
    ).rejects.toBeInstanceOf(TRPCError);
    expect(updateAccountClassification).not.toHaveBeenCalled();
  });

  it("allows mutations for non-platform users", async () => {
    await expect(assertUserDeletable(otherUser.id)).resolves.toBeUndefined();
    await expect(assertProtectedUserRoleModifiable(otherUser.id)).resolves.toBeUndefined();
    await expect(
      assertProtectedUserClassificationModifiable(otherUser.id)
    ).resolves.toBeUndefined();

    const caller = appRouter.createCaller(adminContext as any);
    await caller.admin.updateUserRole({ userId: otherUser.id, role: "admin" });
    expect(updateUserRole).toHaveBeenCalledWith(otherUser.id, "admin");

    await expect(
      caller.admin.updateAccountClassification({
        userId: otherUser.id,
        accountClassification: "INTERNAL",
      })
    ).resolves.toMatchObject({ success: true });
  });
});
