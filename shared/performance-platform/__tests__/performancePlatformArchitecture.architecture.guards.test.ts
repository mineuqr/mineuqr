/**
 * PERFORMANCE-PLATFORM-ARCHITECTURE-1 — architecture guards.
 * Architecture / ownership / SSOT only — no collectors, APIs, or runtime hooks.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  PERFORMANCE_ARCHITECTURE_PRINCIPLES,
  PERFORMANCE_DASHBOARD_HOST_PATH,
  PERFORMANCE_DOMAIN_DEFINITIONS,
  PERFORMANCE_HEALTH_STATUSES,
  PERFORMANCE_METRICS_CATALOG,
  PERFORMANCE_PLATFORM_DOES_NOT_OWN,
  PERFORMANCE_PLATFORM_OWNS,
  PERFORMANCE_PLATFORM_PROGRAM,
  PERFORMANCE_SCORE_ARCHITECTURE,
  listRealtimeSsotProjections,
} from "@shared/performance-platform";
import { REALTIME_METRICS_CATALOG } from "../../../server/realtime-platform/observability/realtimeMetricsCatalog";
import { getPlatformOpsSection } from "@/lib/admin/platform-ops/platformOpsSections";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

function listFiles(dirRel: string): string[] {
  const abs = resolve(root, dirRel);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"))
    .map((f) => join(dirRel, f).replace(/\\/g, "/"));
}

describe("PERFORMANCE-PLATFORM-ARCHITECTURE-1", () => {
  it("declares program identity and read-only principles", () => {
    expect(PERFORMANCE_PLATFORM_PROGRAM).toBe(
      "PERFORMANCE-PLATFORM-ARCHITECTURE-1"
    );
    expect(PERFORMANCE_ARCHITECTURE_PRINCIPLES).toContain("read_only");
    expect(PERFORMANCE_ARCHITECTURE_PRINCIPLES).toContain(
      "never_blocks_execution"
    );
    expect(PERFORMANCE_PLATFORM_OWNS).toContain("performance_dashboard");
    expect(PERFORMANCE_PLATFORM_DOES_NOT_OWN).toContain("business_logic");
    expect(PERFORMANCE_PLATFORM_DOES_NOT_OWN).toContain("realtime_transport");
  });

  it("defines domain ownership including Realtime SSOT consumer", () => {
    const realtime = PERFORMANCE_DOMAIN_DEFINITIONS.find(
      (d) => d.id === "realtime"
    );
    expect(realtime?.maturity).toBe("ssot_consumer");
    expect(realtime?.ssotOwner).toContain("realtime-platform/observability");
    expect(
      PERFORMANCE_DOMAIN_DEFINITIONS.some((d) => d.id === "background_jobs")
    ).toBe(true);
    expect(
      PERFORMANCE_DOMAIN_DEFINITIONS.find((d) => d.id === "background_jobs")
        ?.maturity
    ).toBe("reserved");
  });

  it("Realtime catalog projections map to existing observability metric ids", () => {
    const realtimeIds = new Set(REALTIME_METRICS_CATALOG.map((m) => m.id));
    const projections = listRealtimeSsotProjections();
    expect(projections.length).toBeGreaterThan(0);
    for (const row of projections) {
      expect(row.source).toBe("realtime_observability_ssot");
      expect(row.realtimeMetricId, row.id).toBeTruthy();
      expect(
        realtimeIds.has(row.realtimeMetricId!),
        `missing SSOT id ${row.realtimeMetricId}`
      ).toBe(true);
    }
  });

  it("does not invent parallel Realtime collector ids as performance_platform owned", () => {
    const bad = PERFORMANCE_METRICS_CATALOG.filter(
      (m) =>
        m.domain === "realtime" && m.source === "performance_platform"
    );
    expect(bad).toEqual([]);
  });

  it("health + score architecture are definitional only", () => {
    expect(PERFORMANCE_HEALTH_STATUSES).toEqual([
      "healthy",
      "warning",
      "degraded",
      "critical",
      "unknown",
    ]);
    expect(
      PERFORMANCE_SCORE_ARCHITECTURE.every((d) => d.scoringImplemented === false)
    ).toBe(true);
  });

  it("hosts Performance under existing Platform Ops path (no new App routes)", () => {
    expect(PERFORMANCE_DASHBOARD_HOST_PATH).toBe("/admin/platform/performance");
    expect(getPlatformOpsSection("performance").path).toBe(
      "/admin/platform/performance"
    );
    expect(getPlatformOpsSection("performance").status).toBe("architecture");
    const app = read("client/src/App.tsx");
    expect(app).toContain('path="/admin/platform/performance"');
    expect(app).not.toContain('path="/admin/platform/performance/api"');
  });

  it("Performance composition uses platform-ops-ui and shared catalog only", () => {
    const src = read(
      "client/src/components/admin/platform-ops/PlatformOpsPerformanceComposition.tsx"
    );
    expect(src).toContain("@/design-system/platform-ops-ui");
    expect(src).toContain("@shared/performance-platform");
    expect(src).not.toContain("@/lib/trpc");
    expect(src).not.toContain("observabilityDashboard");
    expect(src).not.toMatch(/from ["']@\/server\//);
  });

  it("shared performance-platform package has no runtime collectors or tRPC", () => {
    for (const rel of listFiles("shared/performance-platform")) {
      if (rel.includes("__tests__")) continue;
      const src = read(rel);
      expect(src, rel).not.toMatch(/trpc|express|middleware|setInterval/);
      expect(src, rel).not.toMatch(/createRouter|procedure/);
      expect(src, rel).not.toContain("noteRealtimeEvent");
    }
  });

  it("pages wire Performance composition (not generic reserved slot)", () => {
    const pages = read(
      "client/src/pages/admin/platform-ops/AdminPlatformOpsPages.tsx"
    );
    expect(pages).toContain("PlatformOpsPerformanceComposition");
    expect(pages).not.toMatch(
      /performance[\s\S]*PlatformOpsReservedSection sectionId="performance"/
    );
  });

  it("program docs exist", () => {
    const base =
      "docs/engineering/programs/PERFORMANCE-PLATFORM-ARCHITECTURE-1";
    expect(existsSync(resolve(root, `${base}/IMPLEMENTATION.md`))).toBe(true);
    expect(existsSync(resolve(root, `${base}/FINAL-REPORT.md`))).toBe(true);
  });
});
