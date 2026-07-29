/**
 * OPERATIONS-INFORMATION-ARCHITECTURE-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ADMIN_NAV_GROUPS,
  ADMIN_NAV_ITEMS,
  ADMIN_LEGACY_ROUTES,
  getAdminRoute,
  isAdminNavItemActive,
} from "@/lib/admin/routes/adminRouteRegistry";
import {
  PLATFORM_OPS_SECTION_DEFINITIONS,
  parsePlatformOpsSection,
  isPlatformOpsPath,
} from "@/lib/admin/platform-ops/platformOpsSections";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("OPERATIONS-INFORMATION-ARCHITECTURE-1 navigation", () => {
  it("removes Health Center from top-level sidebar", () => {
    const ids = ADMIN_NAV_ITEMS.map((i) => i.id);
    expect(ids).not.toContain("health");
    expect(getAdminRoute("health").showInNav).toBe(false);
  });

  it("exposes Platform Operations as العمليات / Operations in sidebar", () => {
    const ids = ADMIN_NAV_ITEMS.map((i) => i.id);
    expect(ids).toContain("platform-operations");
    expect(ids).not.toContain("operations");
    expect(getAdminRoute("platform-operations").path).toBe("/admin/platform");
    expect(getAdminRoute("platform-operations").labelKey).toBe(
      "admin.nav.operations"
    );
  });

  it("keeps business management URL stable and out of sidebar", () => {
    expect(getAdminRoute("operations").path).toBe("/admin/operations");
    expect(getAdminRoute("operations").showInNav).toBe(false);
  });

  it("activates platform-operations for nested section paths", () => {
    const item = ADMIN_NAV_ITEMS.find((i) => i.id === "platform-operations")!;
    expect(isAdminNavItemActive(item, "/admin/platform")).toBe(true);
    expect(isAdminNavItemActive(item, "/admin/platform/realtime")).toBe(true);
    expect(isAdminNavItemActive(item, "/admin/platform/health")).toBe(true);
    expect(isAdminNavItemActive(item, "/admin/security")).toBe(false);
  });

  it("sidebar order matches P0 honest IA", () => {
    const main = ADMIN_NAV_GROUPS.find((g) => g.id === "main")!;
    const ids = main.items.map((i) => i.id);
    expect(ids).toEqual([
      "overview",
      "reports",
      "tenants",
      "security",
      "platform-operations",
    ]);
  });
});

describe("OPERATIONS-INFORMATION-ARCHITECTURE-1 routes", () => {
  it("parses platform ops sections", () => {
    expect(parsePlatformOpsSection("/admin/platform")).toBe("overview");
    expect(parsePlatformOpsSection("/admin/platform/realtime")).toBe(
      "realtime"
    );
    expect(isPlatformOpsPath("/admin/platform/jobs")).toBe(true);
    expect(PLATFORM_OPS_SECTION_DEFINITIONS.length).toBe(11);
  });

  it("redirects legacy /admin/health bookmark", () => {
    const legacy = ADMIN_LEGACY_ROUTES.find((r) => r.path === "/admin/health");
    expect(legacy?.canonicalPath).toBe("/admin/platform/health");
    const healthPage = read("client/src/pages/admin/placeholderPages.tsx");
    expect(healthPage).toContain('to="/admin/platform/health"');
  });

  it("wires App routes for platform workspace", () => {
    const app = read("client/src/App.tsx");
    expect(app).toContain('path="/admin/platform"');
    expect(app).toContain('path="/admin/platform/realtime"');
    expect(app).toContain('path="/admin/platform/health"');
    expect(app).toContain('path="/admin/operations"');
  });

  it("realtime page consumes observability APIs only", () => {
    const realtime = read(
      "client/src/components/admin/platform-ops/PlatformOpsRealtimeComposition.tsx"
    );
    expect(realtime).toContain("observabilityDashboard");
    expect(realtime).toContain("observabilityAlerts");
    expect(realtime).not.toContain("getRealtimeMetrics(");
    expect(realtime).toContain("ssotHint");
  });
});

describe("OPERATIONS-INFORMATION-ARCHITECTURE-1 docs", () => {
  it("program docs exist", () => {
    const base =
      "docs/engineering/programs/OPERATIONS-INFORMATION-ARCHITECTURE-1";
    for (const name of ["IMPLEMENTATION.md", "FINAL-REPORT.md"]) {
      expect(existsSync(resolve(root, `${base}/${name}`))).toBe(true);
    }
  });
});
