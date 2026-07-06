import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isBlockedRole } from "../runtimeCapabilities";
import { transition } from "../bootstrapStateMachine";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function walkTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") continue;
      files.push(...walkTsFiles(full));
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      if (entry.name.endsWith(".test.ts")) continue;
      files.push(full);
    }
  }
  return files;
}

describe("OPERATIONAL-SCREEN-CLIENT-1 architecture guards", () => {
  const screenDirs = [
    join(repoRoot, "client/src/pages/screen"),
    join(repoRoot, "client/src/components/operational-screen"),
    join(repoRoot, "client/src/lib/operational-screen"),
  ];

  const screenSources = screenDirs.flatMap((dir) => walkTsFiles(dir)).map((file) => readFileSync(file, "utf8"));

  it("FF-OSC-01: no verifiedProcedure in screen modules", () => {
    for (const source of screenSources) {
      expect(source).not.toContain("verifiedProcedure");
    }
  });

  it("FF-OSC-02: no useAuth in operational screen runtime", () => {
    const runtimeSources = screenSources.filter(
      (source) => !source.includes("architectureGuards.test.ts")
    );
    for (const source of runtimeSources) {
      expect(source).not.toMatch(/\buseAuth\s*\(/);
    }
  });

  it("FF-OSC-03: kitchen queue fetched in runtime stream, not presentation", () => {
    const kitchenPresentation = read("client/src/components/operational-screen/KitchenScreenPanel.tsx");
    const runtimeStream = read("client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts");
    expect(runtimeStream).toContain("operationalDevice.runtime.getKitchenQueue");
    expect(kitchenPresentation).toContain("useKitchenRuntimeStream");
    expect(kitchenPresentation).not.toContain("operationalDevice.runtime.getKitchenQueue");
    expect(kitchenPresentation).not.toContain(".filter(");
  });

  it("KITCHEN-DISPLAY-DENSITY-1: density flows through runtime manager only", () => {
    const manager = read("client/src/lib/operational-screen/density/runtimeDisplayDensityManager.ts");
    const kitchen = read("client/src/components/operational-screen/KitchenScreenPanel.tsx");
    const card = read("client/src/components/kitchen/KitchenExecutionCard.tsx");
    expect(manager).toContain("RuntimeDisplayDensityManager");
    expect(kitchen).toContain("resolvedDensityModel");
    expect(kitchen).not.toContain("displayDensity");
    expect(kitchen).not.toContain("screenConfig");
    expect(card).toContain("densityModel");
    expect(card).not.toContain("compact");
    expect(card).not.toContain("comfortable");
  });

  it("KITCHEN-CATEGORY-FILTER-1: filtering in runtime layer only", () => {
    const filterManager = read("client/src/lib/operational-screen/category-filter/runtimeCategoryFilterManager.ts");
    const applyFilter = read("client/src/lib/operational-screen/kitchen/applyKitchenCategoryFilter.ts");
    const kitchen = read("client/src/components/operational-screen/KitchenScreenPanel.tsx");
    expect(filterManager).toContain("RuntimeCategoryFilterManager");
    expect(applyFilter).toContain("applyKitchenCategoryFilter");
    expect(kitchen).not.toContain("visibleCategoryIds");
    expect(kitchen).not.toContain("categoryIds");
    expect(kitchen).not.toContain("screenConfig");
  });

  it("ROLE-RUNTIME-1: single resolver via RuntimeRoleHost (no RoleRouter switch)", () => {
    const entry = read("client/src/pages/screen/OperationalScreenEntry.tsx");
    const roleHost = read("client/src/components/operational-screen/RuntimeRoleHost.tsx");
    expect(entry).toContain("RuntimeRoleHost");
    expect(roleHost).toContain("resolveRuntimeRole");
    expect(roleHost).not.toContain("PrintMonitorScreenPanel");
  });

  it("HARDENING-04: role presentations consume the runtime provider (no prop-drilling)", () => {
    const kitchen = read("client/src/components/operational-screen/KitchenScreenPanel.tsx");
    const blocked = read("client/src/components/operational-screen/roles/BlockedRolePresentation.tsx");
    const roleHost = read("client/src/components/operational-screen/RuntimeRoleHost.tsx");
    expect(kitchen).toContain("useRuntimeContext");
    expect(blocked).toContain("useResolvedRuntimeRole");
    expect(kitchen).toContain("export function KitchenScreenPanel()");
    expect(roleHost).toContain("useScreenRuntime");
    expect(roleHost).toContain("<Presentation />");
  });

  it("FF-BOOT-01: bootstrap does not call authenticate on normal boot", () => {
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");
    expect(orchestrator).not.toContain("authenticate");
    const entry = read("client/src/pages/screen/OperationalScreenEntry.tsx");
    expect(entry).not.toContain("authenticate");
  });

  it("HARDENING-03: single canonical runtime authority (no legacy bootstrap hook)", () => {
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");
    // Exposed context always carries the authoritative phase (no duplicated phase state).
    expect(orchestrator).toContain("bootstrap: { ...context.bootstrap, phase }");
    // Legacy duplicated-state hook must not exist.
    expect(() => read("client/src/lib/operational-screen/useScreenBootstrap.ts")).toThrow();
  });

  it("HARDENING-02: lifecycle changes route through the state machine dispatch", () => {
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");
    // No direct setPhase outside the dispatch choke point.
    const directSetPhase = orchestrator.match(/setPhase\(/g) ?? [];
    // Exactly one setPhase, inside dispatch().
    expect(directSetPhase.length).toBe(1);
    expect(orchestrator).toContain("transition(current, event)");
  });

  it("FF-PAIR-01: pairing module does not import heartbeat hooks", () => {
    const pairing = read("client/src/components/operational-screen/PairingShell.tsx");
    expect(pairing).not.toContain("heartbeat");
    expect(pairing).not.toContain("getKitchenQueue");
  });

  it("FF-BOOT-05: main.tsx skips login redirect on /screen routes", () => {
    const main = read("client/src/main.tsx");
    expect(main).toContain('startsWith("/screen")');
  });

  it("SCREEN-CONFIG-RUNTIME-1: configuration flows through manager only", () => {
    const manager = read("client/src/lib/operational-screen/configuration/runtimeConfigurationManager.ts");
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");
    const kitchen = read("client/src/components/operational-screen/KitchenScreenPanel.tsx");
    expect(manager).toContain("RuntimeConfigurationManager");
    expect(orchestrator).toContain("RuntimeConfigurationManager");
    expect(orchestrator).toContain("loadInitialConfiguration");
    expect(orchestrator).toContain("reloadConfiguration");
    expect(kitchen).not.toContain("screenConfig");
    expect(kitchen).not.toContain("getStatus");
  });

  it("FF-BOOT-07: unsupported roles reach Blocked Runtime after heartbeat is active", () => {
    expect(isBlockedRole("pickup_display")).toBe(true);
    expect(isBlockedRole("customer_display")).toBe(true);
    expect(isBlockedRole("self_ordering_kiosk")).toBe(true);
    expect(isBlockedRole("print_monitor")).toBe(true);
    expect(isBlockedRole("kitchen_display")).toBe(false);
    expect(isBlockedRole("expo_display")).toBe(false);

    const running = transition("heartbeat_active", { type: "HEARTBEAT_STARTED" });
    expect(running).toBe("running");
    const blocked = transition(running, { type: "RUN_BLOCKED" });
    expect(blocked).toBe("blocked");
  });
});
