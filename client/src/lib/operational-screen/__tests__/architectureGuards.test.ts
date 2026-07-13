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

  it("OPERATIONAL-CARD-POLISH-1: operational cards use English numerals", () => {
    const typography = read("client/src/lib/operational-screen/operationalCardTypography.ts");
    const mapper = read("client/src/lib/order-presentation/mapOrderPresentation.ts");
    const card = read("client/src/components/kitchen/KitchenExecutionCard.tsx");
    expect(typography).toContain("formatOperationalElapsedCompact");
    expect(mapper).toContain("formatOperationalElapsedCompact");
    expect(card).toContain("formatOperationalQuantity");
    expect(card).not.toContain("toArabicDigits");
  });

  it("OPERATIONAL-CARD-POLISH-1: execution footer groups elapsed time and status", () => {
    const card = read("client/src/components/kitchen/KitchenExecutionCard.tsx");
    expect(card).toContain("OperationalExecutionFooter");
    expect(card).toContain("presentation.statusLabel");
    expect(card).not.toContain("KitchenStatusIndicator");
  });

  it("OPERATIONAL-CARD-POLISH-2: operational item table uses fixed quantity column", () => {
    const card = read("client/src/components/kitchen/KitchenExecutionCard.tsx");
    const density = read("client/src/lib/operational-screen/density/presentationDensityModels.ts");
    expect(card).toContain("OperationalItemTable");
    expect(card).toContain("quantityColumnClass");
    expect(card).not.toMatch(/×\{qty\}|×\$\{/);
    expect(density).toContain("w-[40px]");
  });

  it("OPERATIONAL-CARD-POLISH-2B: item rows use ultra-light separators", () => {
    const card = read("client/src/components/kitchen/KitchenExecutionCard.tsx");
    const typography = read("client/src/lib/operational-screen/operationalCardTypography.ts");
    expect(card).toContain("OPERATIONAL_ITEM_ROW_DIVIDER_CLASS");
    expect(typography).toContain("border-border/[0.08]");
  });

  it("OPERATIONAL-CARD-POLISH-1: operational screen excludes order acceptance", () => {
    const capabilities = read(
      "client/src/lib/operational-screen/interaction/deviceOrderExecutionCapabilities.ts"
    );
    const kitchenScreen = read("client/src/components/operational-screen/KitchenScreenPanel.tsx");
    expect(capabilities).toContain("OPERATIONAL_SCREEN_EXCLUDED_ACTIONS");
    expect(capabilities).toContain('"accept-order"');
    expect(kitchenScreen).toContain("resolveOperationalScreenAction");
    expect(kitchenScreen).not.toContain("accept-order");
  });

  it("KITCHEN-LIFECYCLE-OWNERSHIP-1: kitchen runtime excludes order completion", () => {
    const capabilities = read(
      "client/src/lib/operational-screen/interaction/deviceOrderExecutionCapabilities.ts"
    );
    const kitchenScreen = read("client/src/components/operational-screen/KitchenScreenPanel.tsx");
    const mapper = read("client/src/lib/order-presentation/mapOrderPresentation.ts");
    expect(capabilities).toContain("KITCHEN_RUNTIME_FORBIDDEN_LIFECYCLE_ACTIONS");
    expect(capabilities).toContain('"mark-ready"');
    expect(kitchenScreen).not.toContain("mark-ready");
    expect(mapper).not.toContain('id: "mark-ready"');
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

  it("KITCHEN-ITEM-FILTERING-1: item-level projection in runtime read layer", () => {
    const applyFilter = read("client/src/lib/operational-screen/kitchen/applyKitchenCategoryFilter.ts");
    const readModel = read("client/src/lib/operational-screen/kitchen/kitchenRuntimeReadModel.ts");
    const stream = read("client/src/lib/operational-screen/kitchen/buildKitchenRuntimeStream.ts");
    const kitchen = read("client/src/components/operational-screen/KitchenScreenPanel.tsx");
    expect(applyFilter).toContain("filterTicketLineItems");
    expect(applyFilter).toContain("projectKitchenTicketWithLineItems");
    expect(readModel).toContain("projectKitchenTicketWithLineItems");
    expect(stream).toContain("categoryFilterEnabled");
    expect(kitchen).not.toContain("filterTicketLineItems");
    expect(kitchen).not.toContain("applyKitchenCategoryFilter");
  });

  it("KITCHEN-NOTIFICATION-ARCHITECTURE-1: arrival notification owned by runtime layer", () => {
    const manager = read("client/src/lib/operational-screen/kitchen/kitchenArrivalNotification.ts");
    const hook = read("client/src/lib/operational-screen/kitchen/useKitchenArrivalNotifications.ts");
    const streamHook = read("client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts");
    const kitchen = read("client/src/components/operational-screen/KitchenScreenPanel.tsx");
    const card = read("client/src/components/kitchen/KitchenExecutionCard.tsx");
    expect(manager).toContain("KitchenArrivalNotificationManager");
    expect(manager).toContain("processKitchenOrderArrivals");
    expect(hook).toContain("useKitchenArrivalNotifications");
    expect(streamHook).toContain("useKitchenArrivalNotifications");
    expect(kitchen).not.toContain("playKitchenOrderArrivalSound");
    expect(kitchen).not.toContain("KitchenArrivalNotificationManager");
    expect(kitchen).not.toContain("playOwnerNotificationSound");
    expect(card).not.toContain("playKitchenOrderArrivalSound");
  });

  it("KITCHEN-AUDIO-PRIMING-ALIGNMENT-1: kitchen uses dashboard audio priming pathway", () => {
    const kitchenHook = read("client/src/lib/operational-screen/kitchen/useKitchenArrivalNotifications.ts");
    const dashboard = read("client/src/components/OrderAlertSystem.tsx");
    expect(kitchenHook).toContain("primeOwnerDashboardAudioFromGesture");
    expect(kitchenHook).not.toContain("primeOwnerAlertAudioAsset");
    expect(dashboard).toContain("primeOwnerDashboardAudioFromGesture");
    expect(dashboard).not.toContain("primeOwnerAlertAudioAsset");
  });

  it("KITCHEN-ARRIVAL-SEMANTICS-1: arrival uses filtered runtime visibility not pending column", () => {
    const manager = read("client/src/lib/operational-screen/kitchen/kitchenArrivalNotification.ts");
    expect(manager).toContain("collectFilteredVisibleOrderIds");
    expect(manager).not.toContain("collectFilteredPendingOrderIds");
    expect(manager).toContain("announcedVisibleOrderIds");
    expect(manager).not.toContain("announcedPendingOrderIds");
  });

  it("EXPO-WORKSPACE-ARCHITECTURE-1: Expo owns mark-ready on operational screen", () => {
    const capabilities = read(
      "client/src/lib/operational-screen/interaction/deviceOrderExecutionCapabilities.ts"
    );
    const contract = read("client/src/lib/operational-screen/expo/expoWorkspaceContract.ts");
    const kitchenPanel = read("client/src/components/operational-screen/KitchenScreenPanel.tsx");
    expect(capabilities).toContain("KITCHEN_RUNTIME_FORBIDDEN_LIFECYCLE_ACTIONS");
    expect(capabilities).toContain('"mark-ready"');
    expect(contract).toContain("EXPO_EXCLUSIVE_OPERATIONAL_LIFECYCLE_ACTIONS");
    expect(contract).toContain("operationalScreenExposesMarkReady");
    expect(kitchenPanel).toContain("resolveOperationalScreenAction");
    expect(kitchenPanel).not.toContain("mark-ready");
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

  it("SCREEN-PAIRING-STORE-STABILITY-1: credential store caches snapshot references", () => {
    const store = read("client/src/lib/operational-screen/credentialStore.ts");
    expect(store).toContain("cachedRaw");
    expect(store).toContain("cachedSnapshot");
    expect(store).toContain("replaceSnapshotCache");
    expect(store).toMatch(/if \(raw === cachedRaw\)/);
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
    expect(orchestrator).toContain("executeRuntimeBootstrap");
    expect(orchestrator).toContain("executeRuntimeReconciliation");
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
    expect(fleetCard).toContain("onManage");
    expect(read("client/src/components/screen-management/ScreenManagementWorkspacePanel.tsx")).toContain(
      "ScreenDetailsSheet"
    );
    expect(orchestrator).toContain("runtimeCapabilities");
    expect(orchestrator).toContain("mergeCapabilityIntoHealth");
  });

  it("BUGFIX-F004 — runtime reload keyed on configVersion not heartbeat timestamps", () => {
    const runtimeRouter = read("server/operational-device/routers/operationalDeviceRuntimeRouter.ts");
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");
    const configManager = read("client/src/lib/operational-screen/configuration/runtimeConfigurationManager.ts");

    expect(runtimeRouter).toContain("resolveScreenConfigVersion");
    expect(orchestrator).toContain("executeRuntimeReconciliation");
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
    expect(kitchen).toContain("!isError && presentations.length === 0");
    expect(roleHost).toContain("RuntimeOperationalAlert");
    expect(adapter).toContain("KITCHEN_READ_DATABASE_UNAVAILABLE");
    expect(adapter).not.toMatch(/if \(!db\) return \[\]/);
  });

  it("BUGFIX-F009 — screen settings messaging matches runtime behavior", () => {
    const sheet = read("client/src/components/screen-management/ScreenDisplayTabPanel.tsx");
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

  it("BUGFIX-F010 — pairing uses redeem taxonomy with operator-safe messages", () => {
    const pairing = read("client/src/components/operational-screen/PairingShell.tsx");
    const messages = read("client/src/lib/operational-screen/pairing/pairingRedeemMessages.ts");

    expect(pairing).toContain("resolvePairingRedeemMessage");
    expect(pairing).toContain("redeemPairingCode");
    expect(pairing).not.toMatch(/err\.message/);
    expect(messages).toContain("pairing_code_invalid");
    expect(messages).toContain("pairing_code_used");
  });

  it("SCREEN-PAIRING-CODE-UX-1: unified /screen entry with embedded pairing", () => {
    const entry = read("client/src/pages/screen/OperationalScreenEntry.tsx");
    const pairing = read("client/src/components/operational-screen/PairingShell.tsx");
    const panel = read("client/src/components/operational-screen/pairing/PairingScreenPanel.tsx");

    expect(entry).toContain("PairingShell");
    expect(entry).toContain("ScreenBootLoadingPanel");
    expect(entry).not.toContain("/screen/pair");
    expect(pairing).toContain("PairingScreenPanel");
    expect(pairing).not.toContain("spaNavigate");
    expect(panel).toContain("autoFocus");
    expect(panel).toContain('e.key === "Enter"');
    expect(panel).not.toContain("deviceId");
    expect(panel).not.toContain("tokenId");
    expect(panel).not.toContain("secret");
  });

  it("SCREEN-PAIRING-CODE-UX-1: screen management shows link + pairing code first", () => {
    const access = read("client/src/components/screen-management/ScreenAccessTabPanel.tsx");
    const provisioning = read("client/src/components/screen-provisioning/ProvisioningActivationPanel.tsx");
    const fields = read("client/src/components/screen-management/ScreenOnboardingFields.tsx");

    expect(access).toContain("ScreenOnboardingFields");
    expect(access).toContain("ScreenOnboardingOptionalQr");
    expect(provisioning).toContain("ScreenOnboardingFields");
    expect(fields).toContain("screenLinkLabel");
    expect(fields).toContain("<details");
  });

  it("RUNTIME-INSTANCE-CONTEXT-1: runtime context resolved only by RuntimeContextFactory", () => {
    const factory = read("client/src/lib/operational-screen/RuntimeContextFactory.ts");
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");
    const provider = read("client/src/components/operational-screen/OperationalScreenRuntimeProvider.tsx");
    const runtimeTypes = read("client/src/lib/operational-screen/runtimeTypes.ts");
    const orderActions = read(
      "client/src/lib/operational-screen/interaction/useOperationalDeviceOrderActions.ts"
    );

    expect(factory).toContain("class RuntimeContextFactory");
    expect(factory).toContain("freezeRuntimeInstanceContext");
    const reconcileExecutor = read(
      "client/src/lib/operational-screen/orchestration/runtimeReconciliationExecutor.ts"
    );
    expect(orchestrator).toContain("executeRuntimeBootstrap");
    expect(reconcileExecutor).toContain("runtimeContextFactory.refresh");
    expect(reconcileExecutor).toContain("runtimeContextFactory.applyConfigurationReload");
    expect(provider).toContain("useRuntimeInstanceContext");
    expect(runtimeTypes).toContain("instance: FrozenRuntimeInstanceContext");
    expect(orderActions).toContain("useRuntimeRole");
  });

  it("RUNTIME-CONTEXT-SUBSCRIPTIONS-1: instance snapshots published via RuntimeContextStore", () => {
    const store = read("client/src/lib/operational-screen/runtimeContextStore.ts");
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");
    const provider = read("client/src/components/operational-screen/OperationalScreenRuntimeProvider.tsx");

    expect(store).toContain("class RuntimeContextStore");
    expect(store).toContain("replaceSnapshot");
    expect(store).toContain("RuntimeContextChanged");
    expect(store).not.toMatch(/from "\.\/RuntimeContextFactory"/);
    expect(orchestrator).toContain("store.replaceSnapshot");
    expect(provider).toContain("subscribeRuntimeContextStore");
    expect(provider).not.toMatch(/new EventEmitter|from \"zustand\"|from \"redux\"/);
  });

  it("RUNTIME-CONTEXT-CONSOLIDATION-1: single store owner and canonical read path", () => {
    const storeModule = read("client/src/lib/operational-screen/runtimeContextStore.ts");
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");
    const provider = read("client/src/components/operational-screen/OperationalScreenRuntimeProvider.tsx");
    const orderActions = read(
      "client/src/lib/operational-screen/interaction/useOperationalDeviceOrderActions.ts"
    );

    expect(storeModule).not.toContain("export const runtimeContextStore");
    expect(storeModule).toContain("createRuntimeContextStore");
    expect(orchestrator).toContain("store: RuntimeContextStore");
    expect(orchestrator).not.toContain("useSyncExternalStore");
    expect(orchestrator).not.toContain("instanceContext");
    expect(provider).toContain("createRuntimeContextStore()");
    expect(provider).toContain("RuntimeInstanceSnapshotProvider");
    expect(provider).toContain("useRuntimeInstanceContext");
    expect(provider).toContain("instanceContext");
    expect(orderActions).toContain("useRuntimeRole");
  });

  it("RUNTIME-CONTEXT-SELECTORS-1: stable selectors are thin read facades", () => {
    const provider = read("client/src/components/operational-screen/OperationalScreenRuntimeProvider.tsx");
    const selectors = read("client/src/lib/operational-screen/runtimeContextSelectors.ts");
    const orderActions = read(
      "client/src/lib/operational-screen/interaction/useOperationalDeviceOrderActions.ts"
    );

    for (const hook of [
      "useRuntimeIdentity",
      "useRuntimeBusiness",
      "useRuntimeDevice",
      "useRuntimeRole",
      "useRuntimeConfiguration",
      "useRuntimeCapabilities",
      "useRuntimeSession",
      "useRuntimeMetadata",
    ]) {
      expect(provider).toContain(`export function ${hook}()`);
    }

    expect(selectors).toContain("selectRuntimeIdentity");
    expect(selectors).toContain("selectRuntimeMetadata");
    expect(selectors).not.toMatch(/useState|useEffect|useSyncExternalStore|RuntimeContextFactory/);
    expect(orderActions).toContain("useRuntimeRole");
    expect(orderActions).not.toContain("useRuntimeInstanceContext");
  });

  it("RUNTIME-CONTEXT-ACTIONS-1: stable actions are thin execution facades", () => {
    const provider = read("client/src/components/operational-screen/OperationalScreenRuntimeProvider.tsx");
    const actions = read("client/src/lib/operational-screen/runtimeContextActions.ts");
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");
    const shell = read("client/src/components/operational-screen/OperationalScreenShell.tsx");
    const entry = read("client/src/pages/screen/OperationalScreenEntry.tsx");

    expect(provider).toContain("export function useRuntimeActions()");
    expect(actions).toContain("createRuntimeActions");
    expect(actions).toContain("refresh:");
    expect(actions).toContain("reloadConfiguration:");
    expect(actions).toContain("unpair:");
    expect(actions).toContain("retry:");
    expect(actions).not.toMatch(/useState|useEffect|useSyncExternalStore|RuntimeContextFactory/);
    expect(actions).not.toContain("RuntimeContextStore");
    expect(orchestrator).toContain("refresh:");
    expect(orchestrator).not.toContain("export function useRuntimeActions");
    expect(shell).toContain("useRuntimeActions");
    expect(entry).toContain("useRuntimeActions");
    expect(shell).not.toMatch(/\bunpair\b[\s\S]*useScreenRuntime/);
  });

  it("RUNTIME-PUBLIC-API-CONSOLIDATION-1: governed public API boundary", () => {
    const governance = read("client/src/lib/operational-screen/runtime/runtimeApiGovernance.ts");
    const publicBarrel = read("client/src/lib/operational-screen/runtime/index.ts");
    const provider = read("client/src/components/operational-screen/OperationalScreenRuntimeProvider.tsx");
    const factory = read("client/src/lib/operational-screen/RuntimeContextFactory.ts");
    const store = read("client/src/lib/operational-screen/runtimeContextStore.ts");
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");
    const shell = read("client/src/components/operational-screen/OperationalScreenShell.tsx");
    const entry = read("client/src/pages/screen/OperationalScreenEntry.tsx");

    expect(governance).toContain("RUNTIME-PUBLIC-API-CONSOLIDATION-1");
    expect(governance).toContain("RUNTIME_PUBLIC_READ_API");
    expect(governance).toContain("RUNTIME_PUBLIC_EXECUTE_API");
    expect(governance).toContain("RUNTIME_TRANSITIONAL_COMPATIBILITY_API");
    expect(governance).toContain("RUNTIME_INTERNAL_MODULES");

    for (const hook of [
      "useRuntimeIdentity",
      "useRuntimeBusiness",
      "useRuntimeDevice",
      "useRuntimeRole",
      "useRuntimeConfiguration",
      "useRuntimeCapabilities",
      "useRuntimeSession",
      "useRuntimeMetadata",
      "useRuntimeInstanceContext",
      "useRuntimeActions",
    ]) {
      expect(publicBarrel).toContain(hook);
      expect(provider).toContain(`@classification Public Runtime API`);
    }

    expect(provider).toContain("@classification Transitional Compatibility API");
    expect(provider).toContain("@classification Internal Runtime API");
    expect(factory).toContain("@internal Runtime Platform");
    expect(store).toContain("@internal Runtime Platform");
    expect(orchestrator).toContain("@internal Runtime Platform");
    expect(orchestrator).toContain("Distinct public contracts");
    expect(publicBarrel).not.toContain("useRuntimeContextStore");
    expect(shell).toContain("useRuntimeActions");
    expect(entry).toContain("useRuntimeActions");
    expect(shell).not.toContain("useScreenRuntime");
  });
});
