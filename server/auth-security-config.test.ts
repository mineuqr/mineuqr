import { describe, expect, it, vi, afterEach } from "vitest";

describe("validateAuthSecurityConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws in production when JWT_SECRET is weak", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "dev-local-jwt-secret-change-in-production");
    vi.stubEnv("VITE_APP_ID", "test-app");

    const { validateAuthSecurityConfig } = await import("./_core/authSecurity");
    expect(() => validateAuthSecurityConfig()).toThrow(/JWT_SECRET/);
  });

  it("does not throw in development with weak secret", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("JWT_SECRET", "dev-local-jwt-secret-change-in-production");

    const { validateAuthSecurityConfig } = await import("./_core/authSecurity");
    expect(() => validateAuthSecurityConfig()).not.toThrow();
  });
});
