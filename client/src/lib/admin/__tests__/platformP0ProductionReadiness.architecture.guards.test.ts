/**
 * PLATFORM-P0-PRODUCTION-READINESS-1 — architecture / IA guards.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ADMIN_NAV_HONESTY_MATRIX,
} from "@/lib/admin/adminNavHonesty";
import {
  ADMIN_NAV_GROUPS,
  getAdminRoute,
} from "@/lib/admin/routes/adminRouteRegistry";
import {
  PLATFORM_OPS_SECTION_DEFINITIONS,
  getPlatformOpsSection,
  isPlatformOpsOperationallyLive,
  platformOpsStatusLabelKey,
} from "@/lib/admin/platform-ops/platformOpsSections";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("PLATFORM-P0-PRODUCTION-READINESS-1", () => {
  it("primary nav is honest — no Coming Soon entries", () => {
    const ids = ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toEqual([
      "overview",
      "reports",
      "tenants",
      "security",
      "platform-operations",
    ]);
    expect(ids).not.toContain("customer-success");
    expect(ids).not.toContain("launch-readiness");
    expect(ids).not.toContain("commercial");
    expect(ids).not.toContain("analytics");

    for (const entry of ADMIN_NAV_HONESTY_MATRIX) {
      const route = getAdminRoute(entry.routeId);
      const inNav = route.showInNav !== false;
      expect(inNav).toBe(entry.primaryNav);
      if (entry.productStatus === "coming_soon") {
        expect(entry.primaryNav).toBe(false);
      }
    }
  });

  it("Reports is the canonical hub; Commercial/Analytics are destinations", () => {
    expect(getAdminRoute("reports").path).toBe("/admin/reports");
    expect(getAdminRoute("reports").showInNav).not.toBe(false);
    expect(getAdminRoute("commercial").showInNav).toBe(false);
    expect(getAdminRoute("analytics").showInNav).toBe(false);
    expect(getAdminRoute("commercial").breadcrumbs.some((b) => b.routeId === "reports")).toBe(
      true
    );
    expect(getAdminRoute("analytics").breadcrumbs.some((b) => b.routeId === "reports")).toBe(
      true
    );

    const hub = read(
      "client/src/components/admin/domains/reports/AdminReportsHubComposition.tsx"
    );
    expect(hub).toContain("@/design-system/platform-ops-ui");
    expect(hub).toContain('href: "/admin/commercial"');
    expect(hub).toContain('href: "/admin/analytics"');
    expect(hub).not.toContain("@/lib/trpc");
  });

  it("Platform Ops status semantics are truthful", () => {
    expect(getPlatformOpsSection("realtime").status).toBe("live");
    expect(getPlatformOpsSection("overview").status).toBe("live");
    expect(getPlatformOpsSection("health").status).toBe("architecture");
    expect(getPlatformOpsSection("performance").status).toBe("architecture");
    expect(getPlatformOpsSection("devices").status).toBe("architecture");
    expect(getPlatformOpsSection("subscription").status).toBe("architecture");
    expect(getPlatformOpsSection("jobs").status).toBe("architecture");
    expect(getPlatformOpsSection("events").status).toBe("architecture");
    expect(getPlatformOpsSection("diagnostics").status).toBe("architecture");
    expect(getPlatformOpsSection("audit").status).toBe("reserved");

    for (const section of PLATFORM_OPS_SECTION_DEFINITIONS) {
      if (section.status === "architecture" || section.status === "reserved") {
        expect(isPlatformOpsOperationallyLive(section.status)).toBe(false);
      }
      expect(platformOpsStatusLabelKey(section.status)).toMatch(
        /^admin\.platformOps\.status\./
      );
    }

    const nav = read(
      "client/src/components/admin/platform-ops/PlatformOpsSectionNav.tsx"
    );
    expect(nav).toContain("platformOpsStatusBadgeTone");
    expect(nav).toContain("platformOpsStatusLabelKey");
  });

  it("customer-success redirects; launch-readiness stays hidden placeholder", () => {
    const pages = read("client/src/pages/admin/placeholderPages.tsx");
    expect(pages).toContain("AdminCustomerSuccessPage");
    expect(pages).toContain('operationsTabHref("accounts")');
    expect(pages).toContain("AdminLaunchReadinessPage");
    expect(getAdminRoute("customer-success").showInNav).toBe(false);
    expect(getAdminRoute("launch-readiness").showInNav).toBe(false);
  });

  it("does not change APIs, ownership packages, or introduce collectors", () => {
    const hub = read(
      "client/src/components/admin/domains/reports/AdminReportsHubComposition.tsx"
    );
    expect(hub).not.toMatch(/trpc\.|createRouter|setInterval/);
    expect(
      existsSync(
        resolve(
          root,
          "docs/engineering/programs/PLATFORM-P0-PRODUCTION-READINESS-1/FINAL-REPORT.md"
        )
      )
    ).toBe(true);
  });
});
