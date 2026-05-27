import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";

type Session = { openId: string; appId: string; name: string };

const mocks = vi.hoisted(() => {
  const verifySession = vi.fn<[], Promise<Session | null>>();
  const getUserByOpenId = vi.fn();
  const updateUserPassword = vi.fn();
  return { verifySession, getUserByOpenId, updateUserPassword };
});

vi.mock("./_core/sdk", () => ({
  sdk: {
    verifySession: mocks.verifySession,
  },
}));

vi.mock("./_core/env", () => ({
  ENV: {
    // Keep appId deterministic so session appId check doesn't 401 in tests.
    appId: "test-app",
  },
}));

vi.mock("./db", () => ({
  getUserByOpenId: mocks.getUserByOpenId,
  updateUserPassword: mocks.updateUserPassword,
}));

// Import after mocks
import { localAuthRouter } from "./auth-local";

function makeUrl(baseUrl: string, path: string) {
  return `${baseUrl}${path}`;
}

describe("POST /api/auth/change-password (STAB-SEC-1B.3D)", () => {
  let server: ReturnType<ReturnType<typeof express>["listen"]>;
  let baseUrl: string;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use(localAuthRouter);
    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("A) allows local_ user with valid session → success", async () => {
    mocks.verifySession.mockResolvedValueOnce({
      openId: "local_test@example.com",
      appId: "test-app",
      name: "Local User",
    });
    mocks.getUserByOpenId.mockResolvedValueOnce({
      openId: "local_test@example.com",
      passwordHash: null,
    });
    mocks.updateUserPassword.mockResolvedValueOnce(undefined);

    const res = await fetch(makeUrl(baseUrl, "/api/auth/change-password"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "app_session_id=test",
      },
      body: JSON.stringify({ newPassword: "newpass123" }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
    expect(mocks.updateUserPassword).toHaveBeenCalledTimes(1);
  });

  it("B) rejects OAuth/external user with valid session → forbidden", async () => {
    mocks.verifySession.mockResolvedValueOnce({
      openId: "user-123",
      appId: "test-app",
      name: "External User",
    });
    mocks.getUserByOpenId.mockResolvedValueOnce({
      openId: "user-123",
      passwordHash: null,
    });

    const res = await fetch(makeUrl(baseUrl, "/api/auth/change-password"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "app_session_id=test",
      },
      body: JSON.stringify({ newPassword: "newpass123" }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body?.error).toMatch(/تغيير كلمة المرور متاح فقط/);
    expect(mocks.updateUserPassword).toHaveBeenCalledTimes(0);
  });

  it("C) invalid session → unauthorized", async () => {
    mocks.verifySession.mockResolvedValueOnce(null);

    const res = await fetch(makeUrl(baseUrl, "/api/auth/change-password"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ newPassword: "newpass123" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body?.error).toBe("غير مصرح");
  });

  it("D) missing user after session validation → safe failure", async () => {
    mocks.verifySession.mockResolvedValueOnce({
      openId: "local_missing@example.com",
      appId: "test-app",
      name: "Missing User",
    });
    mocks.getUserByOpenId.mockResolvedValueOnce(null);

    const res = await fetch(makeUrl(baseUrl, "/api/auth/change-password"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "app_session_id=test",
      },
      body: JSON.stringify({ newPassword: "newpass123" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body?.error).toBe("المستخدم غير موجود");
  });
});

