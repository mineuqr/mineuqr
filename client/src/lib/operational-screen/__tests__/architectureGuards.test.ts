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

  it("DEVICE-AUTHENTICATED-OPERATIONS-1: screen executes via device runtime only", () => {
    const kitchen = read("client/src/components/operational-screen/KitchenScreenPanel.tsx");
    const hook = read("client/src/lib/operational-screen/interaction/useOperationalDeviceOrderActions.ts");
    expect(kitchen).toContain("useOperationalDeviceOrderActions");
    expect(kitchen).not.toContain("useOrderStatusActions");
    expect(hook).toContain("screenTrpc.operationalDevice.runtime.executeOrderAction");
    expect(hook).not.toContain("trpc.order.updateStatus");
  });

  it("FF-OSC-03: kitchen queue fetched in runtime stream, not presentation", () => {
    const kitchenPresentation = read("client/src/components/operational-screen/KitchenScreenPanel.tsx");
    const runtimeStream = read("client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts");
    expect(runtimeStream).toContain("operationalDevice.runtime.getKitchenQueue");
    expect(kitchenPresentation).toContain("useKitchenRuntimeStream");
    expect(kitchenPresentation).not.toContain("operationalDevice.runtime.getKitchenQueue");
    expect(kitchenPresentation).not.toContain(".filter(");
  });

  it("SCREEN-STATE-MODEL-1: canonical state via aggregator only", () => {
    const aggregator = read("client/src/lib/operational-screen/state/operationalScreenStateAggregator.ts");
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");
    const banner = read("client/src/components/operational-screen/RoleRuntimeStatusBanner.tsx");
    const shell = read("client/src/components/operational-screen/OperationalScreenShell.tsx");
    expect(aggregator).toContain("OperationalScreenStateAggregator");
    expect(orchestrator).toContain("stateAggregatorRef");
    expect(orchestrator).toContain("projectHealthFromScreenState");
    expect(orchestrator).toContain("projectDiagnosticsFromScreenState");
    expect(banner).toContain("screenState");
    expect(banner).not.toContain("useRoleRuntimeHealth");
    expect(shell).not.toContain("degraded");
    expect(shell).not.toContain("phase");
  });

  it("KITCHEN-DISPLAY-DENSITY-1: density flows through runtime manager only", () => {
    const manager = read("client/src/lib/operational-screen/density/runtimeDisplayDensityManager.ts");
    const kitchen = read("client/src/components/operational-screen/KitchenScreenPanel.tsx");
    const card = read("client/src/components/kitchen/KitchenExecutionCard.tsx");
    expect(manager).toContain("RuntimeDisplayDensityManager");
    expect(kitchen).toContain("resolvedDensityModel");
    expect(kitchen).not.toContain("displayDensity");
    expect(kitchen).not.toContain("screenConfig");
    expect(kitchen).toContain("KITCHEN_GRID_CLASS");
    expect(card).toContain("densityModel");
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

  it("ORDER-READ-CATEGORY-PROJECTION-1: runtime consumes canonical category projections only", () => {
    const readModel = read("client/src/lib/operational-screen/kitchen/kitchenRuntimeReadModel.ts");
    const stream = read("client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts");
    const apply = read("client/src/lib/operational-screen/kitchen/applyKitchenCategoryFilter.ts");
    const manager = read("client/src/lib/operational-screen/category-filter/runtimeCategoryFilterManager.ts");
    expect(readModel).toContain("category.categoryId");
    expect(readModel).not.toContain("missingCategoryData");
    expect(stream).toContain("buildKitchenRuntimeStream");
    expect(read("client/src/lib/operational-screen/kitchen/buildKitchenRuntimeStream.ts")).toContain(
      "projectionDiagnostics"
    );
    expect(apply).not.toContain("missingCategoryData");
    expect(manager).not.toContain("missingCategoryData");
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
    expect(blocked).toContain("useRuntimeContext");
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

  it("RUNTIME-CAPABILITY-NEGOTIATION-1: capability-driven runtime", () => {
    const negotiator = read("client/src/lib/operational-screen/capability/runtimeCapabilityNegotiator.ts");
    const registry = read("client/src/lib/operational-screen/capability/runtimeCapabilityRegistry.ts");
    const contract = read("client/src/lib/operational-screen/capability/runtimeCapabilityContract.ts");
    const roleHost = read("client/src/components/operational-screen/RuntimeRoleHost.tsx");
    const kitchenStream = read("client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts");
    const diagnostics = read("client/src/components/operational-screen/ScreenDiagnosticsPanel.tsx");
    const fleetCard = read("client/src/components/screen-management/FleetScreenCard.tsx");
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");

    expect(contract).toContain("RuntimeCapabilityContract");
    expect(registry).toContain("RuntimeCapabilityRegistry");
    expect(negotiator).toContain("RuntimeCapabilityNegotiator");
    expect(roleHost).toContain("resolveCapabilityPresentation");
    expect(roleHost).not.toContain("resolveRolePresentation");
    expect(kitchenStream).toContain("isCapabilitySupported");
    expect(kitchenStream).not.toContain("kitchen_display");
    expect(diagnostics).toContain("runtimeCapabilities");
    expect(diagnostics).not.toContain("getRoleCapabilities");
    expect(fleetCard).toContain("negotiateManagementCapabilities");
    expect(orchestrator).toContain("runtimeCapabilities");
    expect(orchestrator).toContain("mergeCapabilityIntoHealth");
  });

  it("BUGFIX-F004 — runtime reload keyed on configVersion not heartbeat timestamps", () => {
    const runtimeRouter = read("server/operational-device/routers/operationalDeviceRuntimeRouter.ts");
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");
    const configManager = read("client/src/lib/operational-screen/configuration/runtimeConfigurationManager.ts");

    expect(runtimeRouter).toContain("resolveScreenConfigVersion");
    expect(orchestrator).toContain("detectVersionChange(status.configVersion)");
    expect(configManager).toContain("detectVersionChange(incomingVersion");
    expect(runtimeRouter).not.toMatch(/configVersion:\s*device\.updatedAt/);
  });

  it("BUGFIX-F005/F008/F017 — kitchen failures and runtime errors are visible in production UI", () => {
    const stream = read("client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts");
    const builder = read("client/src/lib/operational-screen/kitchen/buildKitchenRuntimeStream.ts");
    const kitchen = read("client/src/components/operational-screen/KitchenScreenPanel.tsx");
    const roleHost = read("client/src/components/operational-screen/RuntimeRoleHost.tsx");
    const adapter = read("server/kitchen/read/infrastructure/OrderReadQueryAdapter.ts");

    expect(builder).toContain("isShowingStaleData");
    expect(builder).toContain("isError");
    expect(stream).toContain("buildKitchenRuntimeStream");
    expect(kitchen).toContain("KitchenQueueErrorPanel");
    expect(kitchen).toContain("KitchenStaleDataBanner");
    expect(kitchen).toContain("isError && !queue");
    expect(kitchen).toContain("!isError && tickets.length === 0");
    expect(roleHost).toContain("RuntimeOperationalAlert");
    expect(adapter).toContain("KITCHEN_READ_DATABASE_UNAVAILABLE");
    expect(adapter).not.toMatch(/if \(!db\) return \[\]/);
  });

  it("BUGFIX-F009 — screen settings messaging matches runtime behavior", () => {
    const sheet = read("client/src/components/screen-management/ScreenSettingsSheet.tsx");
    const messaging = read("client/src/lib/screen-management/screenSettingsRuntimeMessaging.ts");
    const screenConfig = read("server/operational-device/domain/screenConfig.ts");

    expect(sheet).toContain("screenSettingsRuntimeMessaging");
    expect(sheet).not.toContain("KITCHEN-DISPLAY-DENSITY-1");
    expect(sheet).not.toContain("KITCHEN-CATEGORY-FILTER-1");
    expect(sheet).not.toMatch(/future programs activate/i);
    expect(sheet).not.toMatch(/Activates later/i);
    expect(messaging).toContain("Active at runtime");
    expect(messaging).toContain("configuration reload");
    expect(screenConfig).not.toContain("not applied at runtime yet");
  });

  it("BUGFIX-F010 — pairing uses auth taxonomy with operator-safe messages", () => {
    const auth = read("server/operational-device/services/OperationalDeviceAuthService.ts");
    const pairing = read("client/src/components/operational-screen/PairingShell.tsx");
    const messages = read("client/src/lib/operational-screen/pairing/pairingAuthMessages.ts");
    const bootstrap = read("client/src/lib/operational-screen/bootstrapLogic.ts");

    expect(auth).toContain("resolveCredentialOutcome");
    expect(auth).toContain('code: "device_disabled"');
    expect(auth).toContain('code: "token_revoked"');
    expect(auth).toContain('code: "token_expired"');
    expect(pairing).toContain("resolvePairingAuthMessage");
    expect(pairing).not.toMatch(/err\.message/);
    expect(messages).toContain("device_disabled");
    expect(messages).toContain("token_expired");
    expect(bootstrap).toContain("token_expired");
  });
});
