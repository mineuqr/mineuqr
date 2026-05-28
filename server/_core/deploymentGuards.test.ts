import { describe, expect, it, vi } from "vitest";

describe("deploymentGuardsMiddleware", () => {
  it("does not block on origin mismatch unless enforced", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CSRF_ORIGIN_ENFORCE", "");

    const { deploymentGuardsMiddleware } = await import("./deploymentGuards");

    const req: any = {
      method: "POST",
      path: "/api/auth/login",
      protocol: "https",
      headers: { origin: "https://evil.example" },
      get: (name: string) => (name.toLowerCase() === "host" ? "www.mineuqr.com" : undefined),
      app: { get: () => 1 },
    };
    const res: any = {
      status: vi.fn(() => res),
      json: vi.fn(() => res),
    };
    const next = vi.fn();

    deploymentGuardsMiddleware(req, res, next);
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it("blocks on origin mismatch when enforced", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CSRF_ORIGIN_ENFORCE", "1");

    const { deploymentGuardsMiddleware } = await import("./deploymentGuards");

    const req: any = {
      method: "POST",
      path: "/api/auth/login",
      protocol: "https",
      headers: { origin: "https://evil.example" },
      get: (name: string) => (name.toLowerCase() === "host" ? "www.mineuqr.com" : undefined),
      app: { get: () => 1 },
    };
    const res: any = {
      status: vi.fn(() => res),
      json: vi.fn(() => res),
    };
    const next = vi.fn();

    deploymentGuardsMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

