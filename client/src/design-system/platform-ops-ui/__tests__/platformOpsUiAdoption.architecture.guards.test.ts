/**
 * PLATFORM-OPERATIONS-UI-ADOPTION-1 — architecture guards.
 * Every Platform Ops surface must consume platform-ops-ui; no local presentation chrome.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

function listTsx(dirRel: string): string[] {
  const abs = resolve(root, dirRel);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => join(dirRel, f).replace(/\\/g, "/"));
}

const COMPOSITION_DIR = "client/src/components/admin/platform-ops";

const FORBIDDEN_PRESENTATION = [
  "AdminSection",
  "AdminPageSection",
  "SemanticKpiCard",
  "adminDash.opsTable",
  "adminDash.card",
  "adminDash.opsBadge",
  "AdminOperationsShell",
  "LaunchReadinessPlaceholderSection",
  "AdminSectionPlaceholder",
  "AdminRoutePlaceholderSection",
  'from "@/components/ui/card"',
];

describe("PLATFORM-OPERATIONS-UI-ADOPTION-1", () => {
  it("every platform-ops composition imports the shared foundation", () => {
    for (const rel of listTsx(COMPOSITION_DIR)) {
      const src = read(rel);
      expect(src, rel).toContain("@/design-system/platform-ops-ui");
    }
  });

  it("no platform-ops file keeps forbidden local presentation imports", () => {
    for (const rel of listTsx(COMPOSITION_DIR)) {
      const src = read(rel);
      for (const token of FORBIDDEN_PRESENTATION) {
        expect(src, `${rel} must not contain ${token}`).not.toContain(token);
      }
    }
  });

  it("workspace shell uses PlatformOpsHeader (not AdminOperationsShell)", () => {
    const src = read(
      "client/src/components/admin/platform-ops/PlatformOpsWorkspaceShell.tsx"
    );
    expect(src).toContain("PlatformOpsHeader");
    expect(src).not.toContain("AdminOperationsShell");
  });

  it("section nav uses shared status badge + foundation nav tokens", () => {
    const src = read(
      "client/src/components/admin/platform-ops/PlatformOpsSectionNav.tsx"
    );
    expect(src).toContain("PlatformOpsStatusBadge");
    expect(src).toContain("PLATFORM_OPS_UI.sectionNav");
    expect(src).not.toContain("adminDash");
  });

  it("overview / health / reserved / realtime adopt hero + shared states", () => {
    const overview = read(
      "client/src/components/admin/platform-ops/PlatformOpsOverviewComposition.tsx"
    );
    const health = read(
      "client/src/components/admin/platform-ops/PlatformOpsHealthComposition.tsx"
    );
    const reserved = read(
      "client/src/components/admin/platform-ops/PlatformOpsReservedSection.tsx"
    );
    const realtime = read(
      "client/src/components/admin/platform-ops/PlatformOpsRealtimeComposition.tsx"
    );

    for (const [name, src] of [
      ["overview", overview],
      ["health", health],
      ["reserved", reserved],
      ["realtime", realtime],
    ] as const) {
      expect(src, name).toContain("PlatformOpsHeroSummary");
      expect(src, name).toContain("PlatformOpsMetricCard");
    }

    expect(realtime).toContain("PlatformOpsToolbar");
    expect(realtime).toContain("PlatformOpsTableRoot");
    expect(realtime).toContain("PlatformOpsAlert");
    expect(realtime).toContain("PlatformOpsErrorState");
    expect(realtime).toContain("PlatformOpsLoadingState");
    expect(health).toContain("PlatformOpsEmptyState");
    expect(reserved).toContain("PlatformOpsOwnershipList");
    expect(overview).toContain("PlatformOpsModuleGrid");
  });

  it("program aliases export PlatformOperations* names without new files of visuals", () => {
    const aliases = read(
      "client/src/design-system/platform-ops-ui/aliases.ts"
    );
    expect(aliases).toContain("PlatformOperationsHeader");
    expect(aliases).toContain("PlatformOperationsHero");
    expect(aliases).toContain("PlatformOperationsMetricCard");
    expect(aliases).toContain("from \"./PlatformOpsHeader\"");
    expect(aliases).toContain("from \"./PlatformOpsHeroSummary\"");
  });

  it("dead legacy health fallback removed", () => {
    const health = read(
      "client/src/components/admin/platform-ops/PlatformOpsHealthComposition.tsx"
    );
    expect(health).not.toContain("PlatformOpsHealthPageLegacyFallback");
    expect(health).not.toContain("AdminSectionPlaceholder");
  });

  it("routing / section registry remain presentation-free", () => {
    const routes = read("client/src/lib/admin/routes/adminRoutes.ts");
    const sections = read(
      "client/src/lib/admin/platform-ops/platformOpsSections.ts"
    );
    const pages = read(
      "client/src/pages/admin/platform-ops/AdminPlatformOpsPages.tsx"
    );
    expect(routes).not.toContain("platform-ops-ui");
    expect(sections).not.toContain("platform-ops-ui");
    expect(pages).not.toContain("platform-ops-ui");
    expect(pages).toContain("PlatformOpsWorkspaceShell");
  });
});
