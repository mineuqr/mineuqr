/**
 * PLATFORM-OPERATIONS-UI-FOUNDATION-1 — architecture guards.
 * Presentation layer only: shared foundation reuse; no API/routing/business changes.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  PLATFORM_OPS_HEALTH_STATUSES,
  PLATFORM_OPS_UI,
  mapPlatformOpsHealthToBadgeTone,
  normalizePlatformOpsHealth,
} from "@/design-system/platform-ops-ui";
import { SEMANTIC_KPI_GRID } from "@/design-system/semantic-card";
import { adminDash } from "@/components/admin/layout/adminDashStyles";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

function listTsFiles(dirRel: string): string[] {
  const abs = resolve(root, dirRel);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"))
    .map((f) => join(dirRel, f).replace(/\\/g, "/"));
}

const PLATFORM_OPS_COMPOSITIONS = [
  "client/src/components/admin/platform-ops/PlatformOpsOverviewComposition.tsx",
  "client/src/components/admin/platform-ops/PlatformOpsRealtimeComposition.tsx",
  "client/src/components/admin/platform-ops/PlatformOpsHealthComposition.tsx",
  "client/src/components/admin/platform-ops/PlatformOpsReservedSection.tsx",
  "client/src/components/admin/platform-ops/PlatformOpsWorkspaceShell.tsx",
] as const;

const FOUNDATION_DIR = "client/src/design-system/platform-ops-ui";

describe("PLATFORM-OPERATIONS-UI-FOUNDATION-1", () => {
  it("exports one semantic health status system", () => {
    expect(PLATFORM_OPS_HEALTH_STATUSES).toEqual([
      "healthy",
      "warning",
      "degraded",
      "unavailable",
      "unknown",
    ]);
    expect(mapPlatformOpsHealthToBadgeTone("healthy")).toBe("success");
    expect(mapPlatformOpsHealthToBadgeTone("warning")).toBe("warning");
    expect(mapPlatformOpsHealthToBadgeTone("degraded")).toBe("danger");
    expect(mapPlatformOpsHealthToBadgeTone("unavailable")).toBe("danger");
    expect(mapPlatformOpsHealthToBadgeTone("unknown")).toBe("neutral");
    expect(normalizePlatformOpsHealth("HEALTHY")).toBe("healthy");
  });

  it("hero grids reuse semantic KPI rhythm for 4-column layout", () => {
    expect(PLATFORM_OPS_UI.heroGrid[4]).toBe(SEMANTIC_KPI_GRID.quad);
    expect(PLATFORM_OPS_UI.sections).toBe(adminDash.consoleSections);
    expect(PLATFORM_OPS_UI.workspace).toBe(adminDash.opsWorkspace);
  });

  it("design-system barrel exports platform-ops-ui", () => {
    const barrel = read("client/src/design-system/index.ts");
    expect(barrel).toContain('"./platform-ops-ui"');
  });

  it("foundation package has no business/API/realtime imports", () => {
    for (const rel of listTsFiles(FOUNDATION_DIR)) {
      const src = read(rel);
      expect(src, rel).not.toMatch(/from ["']@\/lib\/trpc/);
      expect(src, rel).not.toMatch(/from ["']@\/server\//);
      expect(src, rel).not.toMatch(/observabilityDashboard|healthRules/);
      expect(src, rel).not.toMatch(/adminRoutes|adminRouteRegistry/);
    }
  });

  it("every Platform Ops composition imports platform-ops-ui foundation", () => {
    for (const rel of PLATFORM_OPS_COMPOSITIONS) {
      const src = read(rel);
      expect(src, rel).toContain("@/design-system/platform-ops-ui");
    }
  });

  it("Platform Ops pages do not invent raw ops tables or pulse loaders", () => {
    const realtime = read(
      "client/src/components/admin/platform-ops/PlatformOpsRealtimeComposition.tsx"
    );
    expect(realtime).not.toContain("adminDash.opsTable");
    expect(realtime).not.toContain("animate-pulse");
    expect(realtime).not.toContain("SemanticKpiCard");
    expect(realtime).toContain("PlatformOpsMetricCard");
    expect(realtime).toContain("PlatformOpsTableRoot");
    expect(realtime).toContain("PlatformOpsHeroSummary");
    expect(realtime).toContain("PlatformOpsAlert");
  });

  it("overview uses module tiles instead of ad-hoc card links", () => {
    const overview = read(
      "client/src/components/admin/platform-ops/PlatformOpsOverviewComposition.tsx"
    );
    expect(overview).toContain("PlatformOpsModuleTile");
    expect(overview).toContain("PlatformOpsSection");
    expect(overview).not.toContain("adminDash.card");
  });

  it("routing and registry files are untouched by this program surface", () => {
    const routes = read("client/src/lib/admin/routes/adminRoutes.ts");
    const sections = read(
      "client/src/lib/admin/platform-ops/platformOpsSections.ts"
    );
    expect(routes).toContain("/admin/platform");
    expect(sections).toContain("PLATFORM_OPS_SECTION_DEFINITIONS");
    // presentation package must not be imported into route SSOT
    expect(routes).not.toContain("platform-ops-ui");
    expect(sections).not.toContain("platform-ops-ui");
  });

  it("pages barrel still wires Platform Ops without foundation coupling", () => {
    const pages = read(
      "client/src/pages/admin/platform-ops/AdminPlatformOpsPages.tsx"
    );
    expect(pages).toContain("PlatformOpsWorkspaceShell");
    expect(pages).not.toContain("@/design-system/platform-ops-ui");
  });
});
