import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import { OPS_EVENT } from "./_core/opsTaxonomy";

const mocks = vi.hoisted(() => ({
  getUserByEmail: vi.fn(),
  createAuthToken: vi.fn(),
  sendEmail: vi.fn(),
  authOpsLog: vi.fn(),
}));

vi.mock("./db", () => ({
  getUserByEmail: mocks.getUserByEmail,
  createAuthToken: mocks.createAuthToken,
}));

vi.mock("./email", () => ({
  sendEmail: mocks.sendEmail,
}));

vi.mock("./_core/authOpsMetadata", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./_core/authOpsMetadata")>();
  return {
    ...actual,
    authOpsLog: mocks.authOpsLog,
  };
});

import { localAuthRouter } from "./auth-local";

function makeUrl(baseUrl: string, path: string) {
  return `${baseUrl}${path}`;
}

function opsEventsOfType(type: string) {
  return mocks.authOpsLog.mock.calls
    .map((call) => call[0] as { type?: string })
    .filter((entry) => entry.type === type);
}

describe("POST /api/auth/forgot-password (PASSWORD-2)", () => {
  let server: ReturnType<ReturnType<typeof express>["listen"]>;
  let baseUrl: string;

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

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createAuthToken.mockResolvedValue({ id: 1 });
    mocks.sendEmail.mockResolvedValue(true);
  });

  it("Case A: sends reset email for email + passwordHash with non-local openId", async () => {
    mocks.getUserByEmail.mockResolvedValueOnce({
      id: 42,
      openId: "j4Ztx2Wi3et3TD5zYNG5fy",
      email: "admin@example.com",
      passwordHash: "$2a$12$hash",
    });

    const res = await fetch(makeUrl(baseUrl, "/api/auth/forgot-password"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@example.com" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mocks.createAuthToken).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail.mock.calls[0][0].to).toBe("admin@example.com");
    expect(opsEventsOfType(OPS_EVENT.password_reset_email_sent)).toHaveLength(1);
  });

  it("Case B: does not create token when user has no passwordHash", async () => {
    mocks.getUserByEmail.mockResolvedValueOnce({
      id: 7,
      openId: "oauth_only_user",
      email: "oauth@example.com",
      passwordHash: null,
    });

    const res = await fetch(makeUrl(baseUrl, "/api/auth/forgot-password"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "oauth@example.com" }),
    });

    expect(res.status).toBe(200);
    expect(mocks.createAuthToken).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(opsEventsOfType(OPS_EVENT.password_reset_email_sent)).toHaveLength(0);
  });

  it("Case C: does not log password_reset_email_sent when sendEmail returns false", async () => {
    mocks.getUserByEmail.mockResolvedValueOnce({
      id: 99,
      openId: "local_user@example.com",
      email: "user@example.com",
      passwordHash: "$2a$12$hash",
    });
    mocks.sendEmail.mockResolvedValueOnce(false);

    const res = await fetch(makeUrl(baseUrl, "/api/auth/forgot-password"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "user@example.com" }),
    });

    expect(res.status).toBe(200);
    expect(mocks.createAuthToken).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(opsEventsOfType(OPS_EVENT.password_reset_email_sent)).toHaveLength(0);
  });

  it("Case D: local_* account with passwordHash still receives reset email", async () => {
    mocks.getUserByEmail.mockResolvedValueOnce({
      id: 3,
      openId: "local_owner@example.com",
      email: "owner@example.com",
      passwordHash: "$2a$12$hash",
    });

    const res = await fetch(makeUrl(baseUrl, "/api/auth/forgot-password"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "owner@example.com" }),
    });

    expect(res.status).toBe(200);
    expect(mocks.createAuthToken).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(opsEventsOfType(OPS_EVENT.password_reset_email_sent)).toHaveLength(1);
  });
});
