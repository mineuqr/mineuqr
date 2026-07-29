/**
 * OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  EVENT_GOVERNANCE_ADRS,
  EVENT_PIPELINE_ARCHITECTURE,
  JOB_PLATFORM_ARCHITECTURE,
  OPERATIONS_RUNTIME_PLATFORM_PROGRAM,
  QUEUE_PLATFORM_ARCHITECTURE,
  RETRY_ARCHITECTURE,
  RUNTIME_ARCHITECTURE_PRINCIPLES,
  RUNTIME_DASHBOARD_HOST_PATHS,
  RUNTIME_DOMAIN_DEFINITIONS,
  RUNTIME_HEALTH_STATUSES,
  RUNTIME_PLATFORM_DOES_NOT_OWN,
  RUNTIME_PLATFORM_OWNS,
  RUNTIME_TIMELINE_ARCHITECTURE,
  WORKER_PLATFORM_ARCHITECTURE,
} from "@shared/operations-runtime-platform";
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

describe("OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1", () => {
  it("declares program identity and principles", () => {
    expect(OPERATIONS_RUNTIME_PLATFORM_PROGRAM).toBe(
      "OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1"
    );
    expect(RUNTIME_ARCHITECTURE_PRINCIPLES).toContain(
      "never_owns_business_entities"
    );
    expect(RUNTIME_ARCHITECTURE_PRINCIPLES).toContain("respect_existing_adrs");
    expect(RUNTIME_PLATFORM_OWNS).toContain("runtime_diagnostics");
    expect(RUNTIME_PLATFORM_DOES_NOT_OWN).toEqual(
      expect.arrayContaining([
        "orders",
        "sessions",
        "checks",
        "reporting",
        "realtime_transport",
        "business_events",
      ])
    );
  });

  it("reserves workers and queues; does not implement them", () => {
    expect(
      RUNTIME_DOMAIN_DEFINITIONS.find((d) => d.id === "workers")?.maturity
    ).toBe("reserved");
    expect(
      RUNTIME_DOMAIN_DEFINITIONS.find((d) => d.id === "queues")?.maturity
    ).toBe("reserved");
    expect(
      WORKER_PLATFORM_ARCHITECTURE.every((w) => w.maturity === "reserved")
    ).toBe(true);
    expect(
      QUEUE_PLATFORM_ARCHITECTURE.every((q) => q.maturity === "reserved")
    ).toBe(true);
    expect(
      JOB_PLATFORM_ARCHITECTURE.every((j) => j.maturity === "reserved")
    ).toBe(true);
    expect(RETRY_ARCHITECTURE.every((r) => r.implemented === false)).toBe(
      true
    );
  });

  it("preserves event governance ADRs and domain consumer ownership", () => {
    expect(EVENT_GOVERNANCE_ADRS).toEqual(["ADR-ARCH-014", "ADR-ARCH-021"]);
    const consumer = EVENT_PIPELINE_ARCHITECTURE.find(
      (s) => s.id === "consumer"
    );
    const projection = EVENT_PIPELINE_ARCHITECTURE.find(
      (s) => s.id === "projection"
    );
    expect(consumer?.runtimeRole).toBe("domain_owned");
    expect(projection?.runtimeRole).toBe("domain_owned");
    expect(
      EVENT_PIPELINE_ARCHITECTURE.find((s) => s.id === "event_bus")
        ?.runtimeRole
    ).toBe("consume_ssot");
  });

  it("defines health + observable timeline", () => {
    expect(RUNTIME_HEALTH_STATUSES).toEqual([
      "healthy",
      "warning",
      "degraded",
      "critical",
      "offline",
      "unknown",
    ]);
    expect(
      RUNTIME_TIMELINE_ARCHITECTURE.every((e) => e.observableOnly === true)
    ).toBe(true);
  });

  it("hosts Runtime on existing Platform Ops paths (no new App routes)", () => {
    expect(RUNTIME_DASHBOARD_HOST_PATHS.jobs).toBe("/admin/platform/jobs");
    expect(RUNTIME_DASHBOARD_HOST_PATHS.events).toBe("/admin/platform/events");
    expect(RUNTIME_DASHBOARD_HOST_PATHS.diagnostics).toBe(
      "/admin/platform/diagnostics"
    );
    expect(getPlatformOpsSection("jobs").status).toBe("architecture");
    expect(getPlatformOpsSection("events").status).toBe("architecture");
    expect(getPlatformOpsSection("diagnostics").status).toBe("architecture");
    const app = read("client/src/App.tsx");
    expect(app).toContain('path="/admin/platform/jobs"');
    expect(app).not.toContain('path="/admin/platform/runtime"');
  });

  it("Runtime composition uses platform-ops-ui and shared catalog only", () => {
    const src = read(
      "client/src/components/admin/platform-ops/PlatformOpsRuntimeComposition.tsx"
    );
    expect(src).toContain("@/design-system/platform-ops-ui");
    expect(src).toContain("@shared/operations-runtime-platform");
    expect(src).not.toContain("@/lib/trpc");
    expect(src).not.toMatch(/from ["']@\/server\//);
  });

  it("shared package has no workers/queues/schedulers/event-bus runtime", () => {
    for (const rel of listFiles("shared/operations-runtime-platform")) {
      if (rel.includes("__tests__")) continue;
      const src = read(rel);
      expect(src, rel).not.toMatch(/trpc|express|Bull|bee-queue|setInterval/);
      expect(src, rel).not.toMatch(/createWorker|createQueue|createScheduler/);
      expect(src, rel).not.toContain("createRouter");
    }
  });

  it("pages wire Runtime surfaces for jobs/events/diagnostics", () => {
    const pages = read(
      "client/src/pages/admin/platform-ops/AdminPlatformOpsPages.tsx"
    );
    expect(pages).toContain('surface="jobs"');
    expect(pages).toContain('surface="events"');
    expect(pages).toContain('surface="diagnostics"');
    expect(pages).not.toMatch(
      /PlatformOpsReservedSection sectionId="jobs"/
    );
  });

  it("program docs exist", () => {
    const base =
      "docs/engineering/programs/OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1";
    expect(existsSync(resolve(root, `${base}/IMPLEMENTATION.md`))).toBe(true);
    expect(existsSync(resolve(root, `${base}/FINAL-REPORT.md`))).toBe(true);
  });
});
