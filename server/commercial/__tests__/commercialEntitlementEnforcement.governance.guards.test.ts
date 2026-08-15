/**
 * COMMERCIAL-ENTITLEMENT-ENFORCEMENT-GOVERNANCE-1
 * Practical static gates only — not a brittle repo-wide mutation scanner.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

const CONSTITUTION =
  "docs/architecture/constitution/Commercial-Entitlement-Enforcement-Constitution-v1.0.md";
const INVARIANTS =
  "docs/architecture/constitution/Commercial-Entitlement-Invariants.md";
const CHECKLIST =
  "docs/engineering/governance/COMMERCIAL-ENTITLEMENT-ENFORCEMENT-CHECKLIST.md";

const FORBIDDEN_MATRICES = [
  "ScreenPlanMatrix",
  "KitchenPlanMatrix",
  "OrderPlanMatrix",
  "POSPlanMatrix",
  "OwnerPlanMatrix",
  "FeaturePlanMatrix",
  "DEVICE_PLAN_MATRIX",
  "SCREEN_PLAN_MATRIX",
];

describe("COMMERCIAL-ENTITLEMENT-ENFORCEMENT-GOVERNANCE-1", () => {
  it("registers constitution, invariants, and reusable checklist", () => {
    expect(existsSync(resolve(root, CONSTITUTION))).toBe(true);
    expect(existsSync(resolve(root, INVARIANTS))).toBe(true);
    expect(existsSync(resolve(root, CHECKLIST))).toBe(true);

    const constitution = read(CONSTITUTION);
    for (let i = 1; i <= 30; i += 1) {
      const id = `CE-${String(i).padStart(2, "0")}`;
      expect(constitution).toContain(id);
    }

    const invariants = read(INVARIANTS);
    for (let i = 1; i <= 18; i += 1) {
      expect(invariants).toContain(`I-CE-${String(i).padStart(2, "0")}`);
    }

    const registry = read("docs/architecture/constitution/Constitution-Registry.md");
    expect(registry).toContain("Commercial Entitlement Enforcement Constitution");
  });

  it("keeps a single entitlement hub", () => {
    const hub = read("server/commercial/getCommercialEntitlements.ts");
    expect(hub).toContain("export async function getCommercialEntitlements");
    expect(hub).toContain("resolveOwnerEntitlements");
    expect(hub).not.toMatch(/planFeatureMatrix/);
    expect(hub).not.toMatch(/if\s*\(\s*plan\s*===\s*["']basic["']/i);
  });

  it("certified devices path still enforces the hub before persist", () => {
    const adapter = read(
      "server/operational-device/authorization/requireDevicesFeature.ts"
    );
    const access = read(
      "server/operational-device/authorization/assertDeviceManagementAccess.ts"
    );
    const management = read(
      "server/operational-device/routers/operationalDeviceManagementRouter.ts"
    );
    expect(adapter).toContain('requireFeature(userId, "devices"');
    expect(adapter).not.toContain('"kitchen"');
    expect(access).toContain("assertRestaurantAccess");
    expect(access).toContain("requireDevicesFeature");
    expect(management).toContain("assertDeviceManagementAccess");
    expect(management).toContain("operationalDevice.management.create");
    for (const name of FORBIDDEN_MATRICES) {
      expect(adapter).not.toContain(name);
      expect(access).not.toContain(name);
    }
  });

  it("checklist forbids plan-name authorization and UI-only gates", () => {
    const checklist = read(CHECKLIST);
    expect(checklist).toContain("requireFeature");
    expect(checklist).toContain("Negative tests");
    expect(checklist).toContain("FROZEN");
    expect(checklist).toMatch(/plan === "basic"/);
  });
});
