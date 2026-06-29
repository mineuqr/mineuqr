import { describe, expect, it, vi, beforeEach } from "vitest";
import { sdk } from "./sdk";
import * as db from "../db";

vi.mock("./env", () => ({
  ENV: {
    appId: "test-app",
    cookieSecret: "test-jwt-secret-32-chars-minimum-aaaaaaaa",
    isProduction: false,
  },
}));

vi.mock("../db", () => ({
  getUserByOpenId: vi.fn(),
}));

function makeCookieHeader(token: string) {
  return `app_session_id=${token}`;
}

describe("session revocation boundary (sessionValidAfter)", () => {
  beforeEach(() => {
    vi.mocked(db.getUserByOpenId).mockReset();
  });

  it("rejects sessions issued before sessionValidAfter", async () => {
    const token = await sdk.signSession(
      { openId: "u1", appId: "test-app", name: "User" },
      { expiresInMs: 60_000 }
    );

    vi.mocked(db.getUserByOpenId).mockResolvedValue({
      id: 1,
      openId: "u1",
      name: "User",
      email: null,
      loginMethod: "manus",
      passwordHash: null,
      emailVerifiedAt: null,
      passwordChangedAt: null,
      // Set revocation boundary slightly in the future to ensure iat < boundary.
      sessionValidAfter: new Date(Date.now() + 10_000).toISOString(),
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any);

    const req = {
      headers: { cookie: makeCookieHeader(token) },
      path: "/api/trpc",
      method: "POST",
    } as any;

    await expect(sdk.authenticateRequest(req)).rejects.toThrow(
      /Invalid session cookie/
    );
  });
});
