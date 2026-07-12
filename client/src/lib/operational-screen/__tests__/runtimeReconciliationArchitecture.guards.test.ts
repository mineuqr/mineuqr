import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { RuntimeConfigurationManager } from "../configuration/runtimeConfigurationManager";
import type { OperationalScreenCredentials } from "../credentialStore";
import type { OperationalScreenRuntimeContext, RuntimeGetStatusResponse } from "../runtimeTypes";
import { runtimeContextFactory } from "../RuntimeContextFactory";
import { createRuntimeContextStore } from "../runtimeContextStore";
import { executeRuntimeBootstrap } from "../orchestration/runtimeBootstrapExecutor";
import {
  executeHeartbeatReconciliation,
  executeRuntimeReconciliation,
} from "../orchestration/runtimeReconciliationExecutor";
import {
  buildInstanceReconciliationKey,
  buildStatusReconciliationKey,
  statusReconciliationChanged,
} from "../orchestration/runtimeReconciliationPolicy";
import {
  publishContextIfChanged,
  publishSnapshotIfChanged,
} from "../orchestration/runtimePublicationPolicy";
import { bootstrapMayExecute, reconciliationMayExecute } from "../orchestration/runtimeOrchestrationPhase";
import { RuntimeOrchestrationSession } from "../orchestration/runtimeOrchestrationSession";

const repoRoot = join(__dirname, "../../../../..");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const credentials: OperationalScreenCredentials = {
  deviceId: "dev-kitchen-01",
  tokenId: "tok-abc",
  secret: "secret-value-16chars",
  pairedAt: "2026-07-10T12:00:00.000Z",
  protocolVersion: 2,
};

function sampleStatus(
  overrides: Partial<RuntimeGetStatusResponse> = {}
): RuntimeGetStatusResponse {
  return {
    device: {
      deviceId: "dev-kitchen-01",
      role: "kitchen_display",
      displayName: "Kitchen Screen A",
      restaurantId: 720007,
      branchId: 3,
      status: "active",
      ...(overrides.device ?? {}),
    },
    screenConfig: {
      language: "ar",
      displayDirection: "rtl",
      displayDensity: "large",
      visibleCategoryIds: [1, 2],
      ...(overrides.screenConfig ?? {}),
    },
    configVersion: overrides.configVersion ?? "42",
    health: {
      presence: "online",
      operational: true,
      status: "active",
      reportedVersion: "web",
      lastSeenAt: "2026-07-10T12:05:00.000Z",
      hasActiveToken: true,
      ...(overrides.health ?? {}),
    },
  };
}

function buildSampleContext(status: RuntimeGetStatusResponse): OperationalScreenRuntimeContext {
  const instance = runtimeContextFactory.resolve({
    credentials,
    status,
    bootstrapId: "boot-test",
  });
  const configManager = new RuntimeConfigurationManager();
  const runtimeConfiguration = runtimeContextFactory.loadConfiguration(status, configManager);
  return runtimeContextFactory.buildRuntimeContext({
    instance,
    bootstrapId: "boot-test",
    phase: "running",
    runtimeHealth: status.health,
    runtimeConfiguration,
    lastAppliedVersion: configManager.getSnapshot().lastAppliedVersion,
  });
}

describe("RUNTIME-RECONCILIATION-ARCHITECTURE-1 policy", () => {
  it("identical status performs no reconciliation", () => {
    const status = sampleStatus();
    const key = buildStatusReconciliationKey(status);
    expect(statusReconciliationChanged(key, status)).toBe(false);
  });

  it("identical snapshot performs no publication", () => {
    const store = createRuntimeContextStore();
    const status = sampleStatus();
    const instance = runtimeContextFactory.resolve({
      credentials,
      status,
      bootstrapId: "boot-snap",
    });
    store.replaceSnapshot(instance, "bootstrap");
    const listener = vi.fn();
    store.subscribe(listener);

    const result = publishSnapshotIfChanged(store, instance, instance, "manual_refresh");
    expect(result.published).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it("identical runtime context performs no setContext publication", () => {
    const context = buildSampleContext(sampleStatus());
    const result = publishContextIfChanged(context, context);
    expect(result.published).toBe(false);
    expect(result.context).toBe(context);
  });

  it("heartbeat with unchanged state performs no-op", () => {
    const store = createRuntimeContextStore();
    const status = sampleStatus();
    const context = buildSampleContext(status);
    const heartbeatAt = "2026-07-10T13:00:00.000Z";
    const withHeartbeat = runtimeContextFactory.withHeartbeat(context.instance, heartbeatAt);
    const contextWithHeartbeat = { ...context, instance: withHeartbeat };
    store.replaceSnapshot(withHeartbeat, "bootstrap");

    const result = executeHeartbeatReconciliation({
      currentContext: contextWithHeartbeat,
      heartbeatAt,
      store,
    });
    expect(result.kind).toBe("no-op");
  });

  it("configuration reload publishes only when config version changes", () => {
    const store = createRuntimeContextStore();
    const status = sampleStatus();
    const configManager = new RuntimeConfigurationManager();
    const context = buildSampleContext(status);
    store.replaceSnapshot(context.instance, "bootstrap");
    runtimeContextFactory.loadConfiguration(status, configManager);
    const session = new RuntimeOrchestrationSession();
    session.recordStatus(status);

    const unchanged = executeRuntimeReconciliation({
      credentials,
      status,
      currentContext: context,
      lastStatusKey: session.getLastStatusKey(),
      configManager,
      store,
    });
    expect(unchanged.kind).toBe("no-op");

    const changedStatus = sampleStatus({ configVersion: "43" });
    const reload = executeRuntimeReconciliation({
      credentials,
      status: changedStatus,
      currentContext: context,
      lastStatusKey: session.getLastStatusKey(),
      configManager,
      store,
    });
    expect(reload.kind).toBe("published");
    if (reload.kind === "published") {
      expect(reload.snapshotPublished).toBe(true);
      expect(reload.contextPublished).toBe(true);
    }
  });
});

describe("RUNTIME-RECONCILIATION-ARCHITECTURE-1 bootstrap", () => {
  it("bootstrap executes as a single publication event", () => {
    const store = createRuntimeContextStore();
    const configManager = new RuntimeConfigurationManager();
    const status = sampleStatus();
    const listener = vi.fn();
    store.subscribe(listener);

    const result = executeRuntimeBootstrap({
      credentials,
      status,
      bootstrapId: "boot-once",
      assembledPhase: "heartbeat_active",
      configManager,
      store,
    });

    expect(result.statusKey).toBe(buildStatusReconciliationKey(status));
    expect(result.context.instance.identity.instanceId).toBe("boot-once");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("RUNTIME-RECONCILIATION-ARCHITECTURE-1 orchestrator architecture guards", () => {
  it("separates bootstrap from reconciliation in the orchestrator", () => {
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");

    expect(orchestrator).toContain("executeRuntimeBootstrap");
    expect(orchestrator).toContain("executeRuntimeReconciliation");
    expect(orchestrator).toContain("executeHeartbeatReconciliation");
    expect(orchestrator).toContain("bootstrapMayExecute(phase)");
    expect(orchestrator).toContain("reconciliationMayExecute(phase)");
    expect(orchestrator).not.toMatch(/if \(!context\) \{/);
    expect(orchestrator).not.toContain("initializedRef");
  });

  it("does not list context in reconciliation effect dependencies", () => {
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");
    const reconcileStart = orchestrator.indexOf("Reconciliation is event-driven");
    const reconcileEnd = orchestrator.indexOf("// Non-auth status errors", reconcileStart);
    const reconcileEffect = orchestrator.slice(reconcileStart, reconcileEnd);
    const depsMatch = reconcileEffect.match(/\}, \[([\s\S]*?)\]\);/);
    expect(depsMatch?.[1] ?? "").not.toMatch(/\bcontext\b/);
  });

  it("keeps publication policy in orchestration layer", () => {
    const policy = read(
      "client/src/lib/operational-screen/orchestration/runtimePublicationPolicy.ts"
    );
    const reconcile = read(
      "client/src/lib/operational-screen/orchestration/runtimeReconciliationExecutor.ts"
    );

    expect(policy).toContain("publishSnapshotIfChanged");
    expect(policy).toContain("publishContextIfChanged");
    expect(reconcile).toContain('kind: "no-op"');
    expect(reconcile).not.toContain("useEffect");
  });

  it("does not modify RuntimeContextFactory, Store, or Public API", () => {
    const factory = read("client/src/lib/operational-screen/RuntimeContextFactory.ts");
    const store = read("client/src/lib/operational-screen/runtimeContextStore.ts");
    const provider = read(
      "client/src/components/operational-screen/OperationalScreenRuntimeProvider.tsx"
    );

    expect(factory).not.toContain("RUNTIME-RECONCILIATION-ARCHITECTURE-1");
    expect(store).not.toContain("RUNTIME-RECONCILIATION-ARCHITECTURE-1");
    expect(provider).not.toContain("executeRuntimeReconciliation");
  });

  it("maps orchestration phases for bootstrap and running states", () => {
    expect(bootstrapMayExecute("validating")).toBe(true);
    expect(bootstrapMayExecute("running")).toBe(false);
    expect(reconciliationMayExecute("running")).toBe(true);
    expect(reconciliationMayExecute("validating")).toBe(false);
  });

  it("prevents render-driven reconciliation via session ledger", () => {
    const session = new RuntimeOrchestrationSession();
    const status = sampleStatus();
    session.recordStatus(status);
    expect(
      executeRuntimeReconciliation({
        credentials,
        status,
        currentContext: buildSampleContext(status),
        lastStatusKey: session.getLastStatusKey(),
        configManager: new RuntimeConfigurationManager(),
        store: createRuntimeContextStore(),
      }).kind
    ).toBe("no-op");
  });
});

describe("RUNTIME-RECONCILIATION-ARCHITECTURE-1 instance key stability", () => {
  it("ignores metadata.createdAt drift when heartbeat is unchanged", () => {
    const status = sampleStatus();
    const first = runtimeContextFactory.resolve({
      credentials,
      status,
      bootstrapId: "boot-a",
    });
    const second = runtimeContextFactory.resolve({
      credentials,
      status,
      bootstrapId: "boot-a",
      lastHeartbeat: first.session.lastHeartbeat,
    });
    expect(buildInstanceReconciliationKey(first)).toBe(buildInstanceReconciliationKey(second));
  });

  it("detects heartbeat changes for publication", () => {
    const status = sampleStatus();
    const base = runtimeContextFactory.resolve({
      credentials,
      status,
      bootstrapId: "boot-hb",
    });
    const withHeartbeat = runtimeContextFactory.withHeartbeat(base, "2026-07-10T13:00:00.000Z");
    expect(buildInstanceReconciliationKey(base)).not.toBe(
      buildInstanceReconciliationKey(withHeartbeat)
    );
  });
});
