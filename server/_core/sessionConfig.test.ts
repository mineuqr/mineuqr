import { describe, expect, it, vi } from "vitest";
import { ONE_YEAR_MS } from "@shared/const";

async function importFresh() {
  vi.resetModules();
  return await import("./sessionConfig");
}

describe("sessionConfig", () => {
  it("defaults to 30 days in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SESSION_TTL_MS", "");
    const { AUTH_SESSION_TTL_MS } = await importFresh();
    expect(AUTH_SESSION_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("defaults to 1 year outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_SESSION_TTL_MS", "");
    const { AUTH_SESSION_TTL_MS } = await importFresh();
    expect(AUTH_SESSION_TTL_MS).toBe(ONE_YEAR_MS);
  });

  it("respects AUTH_SESSION_TTL_MS override when valid", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SESSION_TTL_MS", String(12 * 60 * 60 * 1000));
    const { AUTH_SESSION_TTL_MS } = await importFresh();
    expect(AUTH_SESSION_TTL_MS).toBe(12 * 60 * 60 * 1000);
  });

  it("clamps override above 1 year to 1 year", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SESSION_TTL_MS", String(ONE_YEAR_MS * 2));
    const { AUTH_SESSION_TTL_MS } = await importFresh();
    expect(AUTH_SESSION_TTL_MS).toBe(ONE_YEAR_MS);
  });
});

