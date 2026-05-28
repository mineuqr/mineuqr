import { describe, expect, it, vi } from "vitest";

describe("assessDeploymentAuthReadiness", () => {
  it("reports production defaults with trust proxy enabled", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUST_PROXY", "");
    const { assessDeploymentAuthReadiness } = await import("./deploymentReadiness");
    const report = assessDeploymentAuthReadiness();
    expect(report.environment).toBe("production");
    expect(report.trustProxy).toBe(true);
    expect(report.notes.some((n) => n.includes("x-forwarded-proto"))).toBe(true);
  });

  it("notes dev cookie mode in development", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TRUST_PROXY", "");
    const { assessDeploymentAuthReadiness } = await import("./deploymentReadiness");
    const report = assessDeploymentAuthReadiness();
    expect(report.environment).toBe("development");
    expect(report.notes.some((n) => n.includes("SameSite=lax"))).toBe(true);
  });
});
