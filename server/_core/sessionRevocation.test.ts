import { describe, expect, it, vi } from "vitest";

function makeCookieHeader(token: string) {
  return `app_session_id=${token}`;
}

describe("session revocation boundary (sessionValidAfter)", () => {
  it("rejects sessions issued before sessionValidAfter", async () => {
    vi.resetModules();

    // Ensure ENV loads in a predictable way for the SDK secret.
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("JWT_SECRET", "test-jwt-secret-32-chars-minimum-aaaaaaaa");
    vi.stubEnv("VITE_APP_ID", "test-app");

    const { sdk } = await import("./sdk");

    const token = await sdk.signSession(
      { openId: "u1", appId: "test-app", name: "User" },
      { expiresInMs: 60_000 }
    );

    const db = await import("../db");
    vi.spyOn(db, "getUserByOpenId").mockResolvedValue({
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

