import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    updateUserSessionValidAfter: vi.fn(async () => {}),
  };
});

import { updateUserSessionValidAfter } from "./db";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    passwordHash: null,
    emailVerifiedAt: null,
    passwordChangedAt: null,
    sessionValidAfter: null,
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(updateUserSessionValidAfter).toHaveBeenCalledWith("sample-user");
    // One clear per login cookie variant (OAuth none + email lax, each secure true/false).
    expect(clearedCookies).toHaveLength(5);
    expect(clearedCookies.every((c) => c.name === COOKIE_NAME)).toBe(true);
    expect(clearedCookies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          options: expect.objectContaining({
            secure: true,
            sameSite: "none",
            httpOnly: true,
            path: "/",
          }),
        }),
        expect.objectContaining({
          options: expect.objectContaining({
            secure: false,
            sameSite: "lax",
            httpOnly: true,
            path: "/",
          }),
        }),
      ])
    );
  });
});
