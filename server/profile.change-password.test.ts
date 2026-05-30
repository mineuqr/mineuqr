import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import type { TrpcContext } from "./_core/context";
import type { SelectUser } from "../drizzle/schema";

const mocks = vi.hoisted(() => ({
  updateUserPassword: vi.fn(),
}));

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    updateUserPassword: mocks.updateUserPassword,
  };
});

import { appRouter } from "./routers";

function createAdminLikeContext(passwordHash: string): TrpcContext {
  const user: SelectUser = {
    id: 1,
    openId: "j4Ztx2Wi3et3TD5zYNG5fy",
    email: "k.sh61@yahoo.com",
    name: "Admin",
    loginMethod: "email",
    passwordHash,
    emailVerifiedAt: null,
    passwordChangedAt: null,
    sessionValidAfter: null,
    role: "admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSignedIn: new Date().toISOString(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("profile.changePassword (PASSWORD-1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateUserPassword.mockResolvedValue(undefined);
  });

  it("profile.get exposes canChangePassword for Manus openId with passwordHash", async () => {
    const hash = await bcrypt.hash("Admin123!", 12);
    const caller = appRouter.createCaller(createAdminLikeContext(hash));
    const profile = await caller.profile.get();

    expect(profile.canChangePassword).toBe(true);
    expect(profile.loginMethod).toBe("email");
  });

  it("allows password change for Manus openId + passwordHash (admin account shape)", async () => {
    const currentPassword = "Admin123!";
    const hash = await bcrypt.hash(currentPassword, 12);
    const caller = appRouter.createCaller(createAdminLikeContext(hash));

    const result = await caller.profile.changePassword({
      currentPassword,
      newPassword: "NewAdmin456!",
    });

    expect(result).toEqual({ success: true });
    expect(mocks.updateUserPassword).toHaveBeenCalledWith(
      "j4Ztx2Wi3et3TD5zYNG5fy",
      expect.any(String)
    );
  });

  it("rejects when user has no passwordHash", async () => {
    const caller = appRouter.createCaller(createAdminLikeContext(null as unknown as string));

    await expect(
      caller.profile.changePassword({
        currentPassword: "x",
        newPassword: "newpass123",
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "تغيير كلمة المرور غير متاح لهذا الحساب",
    });
    expect(mocks.updateUserPassword).not.toHaveBeenCalled();
  });
});
