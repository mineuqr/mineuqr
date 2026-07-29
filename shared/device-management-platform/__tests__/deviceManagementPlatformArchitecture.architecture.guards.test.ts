/**
 * DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  DEVICE_ARCHITECTURE_PRINCIPLES,
  DEVICE_ASSIGNMENT_TARGETS,
  DEVICE_CONNECTIVITY_ARCHITECTURE,
  DEVICE_DASHBOARD_HOST_PATH,
  DEVICE_DIAGNOSTICS_ARCHITECTURE,
  DEVICE_HEALTH_STATUSES,
  DEVICE_IDENTITY_FIELDS,
  DEVICE_LIFECYCLE_STATES,
  DEVICE_MANAGEMENT_PLATFORM_PROGRAM,
  DEVICE_PLATFORM_DOES_NOT_OWN,
  DEVICE_PLATFORM_DOMAIN_DEFINITIONS,
  DEVICE_PLATFORM_OWNS,
  DEVICE_PROVISIONING_ARCHITECTURE,
  DEVICE_REGISTRATION_SUPPORTS_RE_REGISTRATION,
  DEVICE_SECURITY_DOES_NOT_REDESIGN,
  DEVICE_UPDATE_ARCHITECTURE,
} from "@shared/device-management-platform";
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

describe("DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2", () => {
  it("declares program identity, ownership, and principles", () => {
    expect(DEVICE_MANAGEMENT_PLATFORM_PROGRAM).toBe(
      "DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2"
    );
    expect(DEVICE_ARCHITECTURE_PRINCIPLES).toEqual(
      expect.arrayContaining([
        "operational_device_lifecycle_ssot",
        "never_owns_business_entities",
        "no_duplicate_collectors",
        "no_authentication_redesign",
        "no_provisioning_implementation",
        "platform_ops_ui_reuse",
      ])
    );
    expect(DEVICE_PLATFORM_OWNS).toEqual(
      expect.arrayContaining([
        "device_metadata",
        "provisioning_metadata",
        "inventory",
        "health",
        "diagnostics",
      ])
    );
    expect(DEVICE_PLATFORM_DOES_NOT_OWN).toEqual(
      expect.arrayContaining([
        "orders",
        "sessions",
        "checks",
        "menus",
        "reporting",
        "realtime_transport",
        "authentication",
        "business_payloads",
      ])
    );
  });

  it("defines lifecycle, identity, assignment, and health models", () => {
    expect(DEVICE_LIFECYCLE_STATES).toEqual([
      "unregistered",
      "provisioning_requested",
      "provisioned",
      "registered",
      "verified",
      "active",
      "suspended",
      "retired",
    ]);
    expect(DEVICE_REGISTRATION_SUPPORTS_RE_REGISTRATION).toBe(true);
    expect(DEVICE_IDENTITY_FIELDS).toEqual(
      expect.arrayContaining([
        "deviceId",
        "tenant",
        "restaurant",
        "provisioningKey",
        "lastSeen",
        "capabilities",
        "tags",
      ])
    );
    expect(DEVICE_ASSIGNMENT_TARGETS).toEqual(
      expect.arrayContaining([
        "restaurant",
        "kitchen",
        "station",
        "zone",
        "table_area",
      ])
    );
    expect(DEVICE_HEALTH_STATUSES).toEqual([
      "healthy",
      "warning",
      "offline",
      "disconnected",
      "provisioning",
      "updating",
      "maintenance",
      "retired",
      "unknown",
    ]);
  });

  it("reserves provisioning and updates; diagnostics are read-only", () => {
    expect(
      DEVICE_PLATFORM_DOMAIN_DEFINITIONS.find(
        (d) => d.id === "device_provisioning"
      )?.maturity
    ).toBe("reserved");
    expect(
      DEVICE_PLATFORM_DOMAIN_DEFINITIONS.find((d) => d.id === "device_updates")
        ?.maturity
    ).toBe("reserved");
    expect(
      DEVICE_PROVISIONING_ARCHITECTURE.every((p) => p.maturity === "reserved")
    ).toBe(true);
    expect(
      DEVICE_UPDATE_ARCHITECTURE.every((u) => u.maturity === "reserved")
    ).toBe(true);
    expect(
      DEVICE_DIAGNOSTICS_ARCHITECTURE.every((d) => d.mutationAllowed === false)
    ).toBe(true);
    expect(DEVICE_SECURITY_DOES_NOT_REDESIGN).toContain(
      "authentication_platform"
    );
  });

  it("connectivity consumes Realtime SSOT for transport-adjacent signals", () => {
    const realtime = DEVICE_CONNECTIVITY_ARCHITECTURE.filter(
      (c) => c.mode === "consume_realtime_ssot"
    ).map((c) => c.id);
    expect(realtime).toEqual(
      expect.arrayContaining([
        "reconnect_count",
        "latency",
        "realtime_connectivity",
      ])
    );
  });

  it("hosts Devices on existing Platform Ops path and marks section live", () => {
    expect(DEVICE_DASHBOARD_HOST_PATH).toBe("/admin/platform/devices");
    expect(getPlatformOpsSection("devices").status).toBe("live");
    const app = read("client/src/App.tsx");
    expect(app).toContain('path="/admin/platform/devices"');
  });

  it("Devices composition uses platform-ops-ui and shared catalog only", () => {
    const src = read(
      "client/src/components/admin/platform-ops/PlatformOpsDevicesComposition.tsx"
    );
    expect(src).toContain("@/design-system/platform-ops-ui");
    expect(src).toContain("@shared/device-management-platform");
    expect(src).not.toContain("@/lib/trpc");
    expect(src).not.toMatch(/from ["']@\/server\//);
    expect(src).not.toMatch(/provisionDevice|enrollDevice|remoteManage/i);
  });

  it("shared package has no provisioning/runtime/API implementation", () => {
    for (const rel of listFiles("shared/device-management-platform")) {
      if (rel.includes("__tests__")) continue;
      const src = read(rel);
      expect(src, rel).not.toMatch(/trpc|express|setInterval/);
      expect(src, rel).not.toContain("createRouter");
      expect(src, rel).not.toMatch(/implementProvisioning|issueProvisionToken/);
    }
  });

  it("pages wire Devices composition; reserved section no longer hosts devices", () => {
    const pages = read(
      "client/src/pages/admin/platform-ops/AdminPlatformOpsPages.tsx"
    );
    expect(pages).toContain("PlatformOpsDevicesComposition");
    expect(pages).not.toMatch(
      /PlatformOpsReservedSection sectionId="devices"/
    );
    const reserved = read(
      "client/src/components/admin/platform-ops/PlatformOpsReservedSection.tsx"
    );
    expect(reserved).not.toMatch(/devices:\s*\[/);
  });

  it("program docs exist", () => {
    const base =
      "docs/engineering/programs/DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2";
    expect(existsSync(resolve(root, `${base}/IMPLEMENTATION.md`))).toBe(true);
    expect(existsSync(resolve(root, `${base}/FINAL-REPORT.md`))).toBe(true);
  });
});
