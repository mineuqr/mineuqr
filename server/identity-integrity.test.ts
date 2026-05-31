import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import type { SelectUser } from "../drizzle/schema";
import { assertOAuthEmailIdentityAvailable } from "./_core/oauthEmailIdentity";

const dbMocks = vi.hoisted(() => ({
  getUserByEmail: vi.fn(),
  updateUserProfile: vi.fn(),
  invalidateUnusedEmailVerificationTokens: vi.fn(),
}));

const emailMocks = vi.hoisted(() => ({
  sendVerificationEmailForUser: vi.fn(),
}));

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getUserByEmail: dbMocks.getUserByEmail,
    updateUserProfile: dbMocks.updateUserProfile,
    invalidateUnusedEmailVerificationTokens:
      dbMocks.invalidateUnusedEmailVerificationTokens,
  };
});

vi.mock("./auth-local/sendVerificationEmail", () => ({
  sendVerificationEmailForUser: emailMocks.sendVerificationEmailForUser,
}));

import { appRouter } from "./routers";

function verifiedUser(overrides: Partial<SelectUser> = {}): SelectUser {
  return {
    id: 7,
    openId: "local_user@example.com",
    name: "User",
    email: "user@example.com",
    loginMethod: "email",
    passwordHash: "hash",
    emailVerifiedAt: new Date().toISOString(),
    passwordChangedAt: null,
    sessionValidAfter: null,
    role: "user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSignedIn: new Date().toISOString(),
    ...overrides,
  };
}

function createContext(user: SelectUser): TrpcContext {
  return {
    user,
    req: { headers: { origin: "https://www.mineuqr.com" } } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("identity integrity (AUTH-POLICY-1B.5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    delete process.env.AUTH_REQUIRE_VERIFIED_EMAIL;
    dbMocks.updateUserProfile.mockResolvedValue(undefined);
    dbMocks.getUserByEmail.mockResolvedValue(undefined);
    emailMocks.sendVerificationEmailForUser.mockResolvedValue(true);
    dbMocks.invalidateUnusedEmailVerificationTokens.mockResolvedValue(undefined);
  });

  describe("profile.update email re-verification", () => {
    it("clears verification and sends email when email changes", async () => {
      const caller = appRouter.createCaller(createContext(verifiedUser()));
      await expect(
        caller.profile.update({ email: "NewUser@Example.com" })
      ).resolves.toEqual({ success: true });

      expect(dbMocks.updateUserProfile).toHaveBeenCalledWith(7, {
        name: undefined,
        email: "newuser@example.com",
        clearEmailVerification: true,
      });
      expect(emailMocks.sendVerificationEmailForUser).toHaveBeenCalledWith(
        expect.anything(),
        { id: 7, email: "newuser@example.com" }
      );
    });

    it("does not clear verification when only name changes", async () => {
      const caller = appRouter.createCaller(createContext(verifiedUser()));
      await expect(caller.profile.update({ name: "New Name" })).resolves.toEqual({
        success: true,
      });

      expect(dbMocks.updateUserProfile).toHaveBeenCalledWith(7, {
        name: "New Name",
        email: undefined,
        clearEmailVerification: false,
      });
      expect(emailMocks.sendVerificationEmailForUser).not.toHaveBeenCalled();
    });

    it("does not re-verify when email unchanged (case-insensitive)", async () => {
      const caller = appRouter.createCaller(createContext(verifiedUser()));
      await expect(
        caller.profile.update({ email: "User@Example.com" })
      ).resolves.toEqual({ success: true });

      expect(dbMocks.updateUserProfile).toHaveBeenCalledWith(7, {
        name: undefined,
        email: undefined,
        clearEmailVerification: false,
      });
      expect(emailMocks.sendVerificationEmailForUser).not.toHaveBeenCalled();
    });

    it("rejects email already owned by another account", async () => {
      dbMocks.getUserByEmail.mockResolvedValueOnce({
        id: 99,
        openId: "local_other@example.com",
        email: "other@example.com",
      });
      const caller = appRouter.createCaller(createContext(verifiedUser()));

      await expect(
        caller.profile.update({ email: "other@example.com" })
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });
  });

  describe("assertOAuthEmailIdentityAvailable", () => {
    it("allows returning OAuth user", async () => {
      const result = await assertOAuthEmailIdentityAvailable({
        isNewUser: false,
        openId: "oauth_1",
        email: "user@example.com",
      });
      expect(result).toEqual({ ok: true });
      expect(dbMocks.getUserByEmail).not.toHaveBeenCalled();
    });

    it("allows new OAuth signup when email is free", async () => {
      dbMocks.getUserByEmail.mockResolvedValueOnce(undefined);
      const result = await assertOAuthEmailIdentityAvailable({
        isNewUser: true,
        openId: "oauth_new",
        email: "new@example.com",
      });
      expect(result).toEqual({ ok: true });
    });

    it("blocks new OAuth signup when email belongs to local account", async () => {
      dbMocks.getUserByEmail.mockResolvedValueOnce({
        id: 1,
        openId: "local_user@example.com",
        email: "user@example.com",
      });
      const result = await assertOAuthEmailIdentityAvailable({
        isNewUser: true,
        openId: "oauth_new",
        email: "user@example.com",
      });
      expect(result).toEqual({ ok: false, reason: "email_identity_collision" });
    });

    it("allows new OAuth signup when email matches same openId row", async () => {
      dbMocks.getUserByEmail.mockResolvedValueOnce({
        id: 1,
        openId: "oauth_same",
        email: "user@example.com",
      });
      const result = await assertOAuthEmailIdentityAvailable({
        isNewUser: true,
        openId: "oauth_same",
        email: "user@example.com",
      });
      expect(result).toEqual({ ok: true });
    });
  });
});
