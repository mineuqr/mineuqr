import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PROVISIONING_VISIBLE_SCREEN_TYPE_IDS,
  PROVISIONING_VISIBLE_SCREEN_TYPE_OPTIONS,
  SCREEN_TYPE_OPTIONS,
} from "../screenLabels";
import { OPERATIONAL_DEVICE_ROLES } from "../../../../../server/operational-device/domain/deviceRoles";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("OPERATIONAL-SCREEN-CATALOG-POLICY-1 architecture guards", () => {
  it("provisioning catalog shows only Kitchen, Waiter, Kiosk", () => {
    expect([...PROVISIONING_VISIBLE_SCREEN_TYPE_IDS].sort()).toEqual(
      ["kitchen_display", "self_ordering_kiosk", "waiter_display"].sort()
    );
    expect(PROVISIONING_VISIBLE_SCREEN_TYPE_OPTIONS.map((o) => o.id).sort()).toEqual(
      ["kitchen_display", "self_ordering_kiosk", "waiter_display"].sort()
    );
  });

  it("hidden screen types remain in full catalog and role enum", () => {
    const ids = SCREEN_TYPE_OPTIONS.map((o) => o.id);
    expect(ids).toContain("expo_display");
    expect(ids).toContain("pickup_display");
    expect(ids).toContain("customer_display");
    expect(ids).toContain("print_monitor");
    expect(OPERATIONAL_DEVICE_ROLES).toContain("expo_display");
    expect(OPERATIONAL_DEVICE_ROLES).toContain("waiter_display");
  });

  it("provisioning create wizard uses visible catalog only", () => {
    const panel = read(
      "client/src/components/screen-provisioning/ProvisioningWorkspacePanel.tsx"
    );
    expect(panel).toContain(
      'import { PROVISIONING_VISIBLE_SCREEN_TYPE_OPTIONS } from "@/lib/operational-screen/screenLabels"'
    );
    expect(panel).toContain("PROVISIONING_VISIBLE_SCREEN_TYPE_OPTIONS.map");
  });

  it("waiter role mounts existing WaiterShell via presentation_waiter", () => {
    const presentation = read(
      "client/src/components/operational-screen/roles/WaiterRolePresentation.tsx"
    );
    const resolve = read(
      "client/src/lib/operational-screen/capability/resolveCapabilityPresentation.ts"
    );
    const roles = read(
      "client/src/lib/operational-screen/roles/roleDefinitions.ts"
    );
    expect(presentation).toContain("WaiterShell");
    expect(presentation).toContain("activation=");
    expect(resolve).toContain("presentation_waiter");
    expect(roles).toContain("waiter_display");
    expect(roles).toContain("supportsWaiterOrdering: true");
  });

  it("does not delete hidden roles from contracts", () => {
    const roles = read("server/operational-device/domain/deviceRoles.ts");
    expect(roles).toContain("expo_display");
    expect(roles).toContain("print_monitor");
    expect(roles).toContain("waiter_display");
  });
});
