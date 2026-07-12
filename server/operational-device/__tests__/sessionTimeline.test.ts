import { describe, expect, it } from "vitest";
import { RuntimeConfigurationManager } from "../../../client/src/lib/operational-screen/configuration/runtimeConfigurationManager";
import type { OperationalScreenCredentials } from "../../../client/src/lib/operational-screen/credentialStore";
import { transition } from "../../../client/src/lib/operational-screen/bootstrapStateMachine";
import { executeRuntimeBootstrap } from "../../../client/src/lib/operational-screen/orchestration/runtimeBootstrapExecutor";
import {
  executeHeartbeatReconciliation,
  executeRuntimeReconciliation,
} from "../../../client/src/lib/operational-screen/orchestration/runtimeReconciliationExecutor";
import { bootstrapMayExecute } from "../../../client/src/lib/operational-screen/orchestration/runtimeOrchestrationPhase";
import { createRuntimeContextStore } from "../../../client/src/lib/operational-screen/runtimeContextStore";
import type {
  BootstrapPhase,
  RuntimeGetStatusResponse,
} from "../../../client/src/lib/operational-screen/runtimeTypes";
import { summarizeDeviceHealth } from "../domain/deviceHealth";
import { validateDeviceOrderAction } from "../domain/deviceOrderExecution";
import { resolveScreenConfigVersion } from "../domain/screenConfigVersion";
import { InMemoryOperationalDeviceStore } from "../infrastructure/InMemoryOperationalDeviceStore";
import { ScreenPairingService } from "../pairing/ScreenPairingService";
import { OperationalDeviceAuthService } from "../services/OperationalDeviceAuthService";
import { OperationalDeviceHeartbeatService } from "../services/OperationalDeviceHeartbeatService";
import { OperationalDeviceRegistryService } from "../services/OperationalDeviceRegistryService";

const START = 1_700_000_000_000;
const RESTAURANT_ID = 901;

function runtimeCredentials(
  credentials: { deviceId: string; tokenId: string; secret: string },
  pairedAt = new Date(START).toISOString()
): OperationalScreenCredentials {
  return {
    ...credentials,
    pairedAt,
    protocolVersion: 2,
  };
}

async function runtimeStatus(
  store: InMemoryOperationalDeviceStore,
  deviceId: string,
  now: number
): Promise<RuntimeGetStatusResponse> {
  const device = await store.getDevice(deviceId);
  if (!device) throw new Error("Expected operational screen");
  const activeToken = await store.findActiveTokenForDevice(deviceId);

  return {
    device: {
      deviceId: device.deviceId,
      role: device.role,
      displayName: device.displayName,
      restaurantId: device.restaurantId,
      branchId: device.branchId,
      status: device.status,
    },
    screenConfig: device.screenConfig,
    configVersion: resolveScreenConfigVersion(device),
    health: summarizeDeviceHealth({
      status: device.status,
      lastSeenAt: device.lastSeenAt,
      reportedVersion: device.reportedVersion,
      hasActiveToken: activeToken != null,
      now,
    }),
  };
}

async function provisionPairAndAuthenticate() {
  let now = START;
  const store = new InMemoryOperationalDeviceStore();
  const registry = new OperationalDeviceRegistryService(store, () => now);
  const pairing = new ScreenPairingService(store, () => now);
  const auth = new OperationalDeviceAuthService(store, () => now);
  const heartbeat = new OperationalDeviceHeartbeatService(store, () => now);

  const created = await registry.createDevice({
    restaurantId: RESTAURANT_ID,
    role: "kitchen_display",
    displayName: "Main Kitchen",
  });
  const redeemed = await pairing.redeemPairingCode(created.token.pairingCode);
  if (!redeemed.ok) throw new Error(`Pairing failed: ${redeemed.code}`);

  const credentials = runtimeCredentials(redeemed.bootstrapCredentials);
  const authenticated = await auth.authenticate(credentials);
  if (!authenticated.ok) throw new Error(`Authentication failed: ${authenticated.code}`);

  return {
    store,
    registry,
    pairing,
    auth,
    heartbeat,
    created,
    credentials,
    session: authenticated.session,
    setNow(value: number) {
      now = value;
    },
    getNow() {
      return now;
    },
  };
}

describe("SESSION-TIMELINE-TEST-1 — Operational Runtime Lifecycle", () => {
  it("provisions, pairs, bootstraps, and remains operational through a long-running timeline", async () => {
    const timeline = await provisionPairAndAuthenticate();
    const { created, credentials, session, store, heartbeat, auth } = timeline;

    expect(session.deviceId).toBe(created.device.deviceId);
    expect(session.tokenId).toBe(created.token.tokenId);
    expect(session.role).toBe("kitchen_display");

    timeline.setNow(START + 30_000);
    await heartbeat.recordHeartbeat({
      deviceId: credentials.deviceId,
      reportedVersion: "runtime-test",
    });
    const initialStatus = await runtimeStatus(store, credentials.deviceId, timeline.getNow());
    const configVersion = initialStatus.configVersion;
    const contextStore = createRuntimeContextStore();
    const configManager = new RuntimeConfigurationManager();
    const bootstrap = executeRuntimeBootstrap({
      credentials,
      status: initialStatus,
      bootstrapId: "boot-long-running",
      assembledPhase: "heartbeat_active",
      configManager,
      store: contextStore,
    });

    expect(bootstrap.context.instance.identity.deviceId).toBe(credentials.deviceId);
    expect(bootstrap.context.instance.session.sessionId).toBe(credentials.tokenId);
    expect(bootstrap.context.bootstrap.bootstrapId).toBe("boot-long-running");

    let runtimeContext = bootstrap.context;
    for (let cycle = 1; cycle <= 5; cycle += 1) {
      timeline.setNow(START + 30_000 + cycle * 60_000);
      const health = await heartbeat.recordHeartbeat({ deviceId: credentials.deviceId });
      expect(health?.operational).toBe(true);

      const heartbeatAt = new Date(timeline.getNow()).toISOString();
      const reconciled = executeHeartbeatReconciliation({
        currentContext: runtimeContext,
        heartbeatAt,
        store: contextStore,
      });
      expect(reconciled.kind).toBe("published");
      if (reconciled.kind === "published") runtimeContext = reconciled.context;

      const authenticated = await auth.authenticate(credentials);
      expect(authenticated.ok).toBe(true);
      expect(runtimeContext.instance.identity.deviceId).toBe(credentials.deviceId);
      expect(runtimeContext.instance.session.sessionId).toBe(credentials.tokenId);
      expect(runtimeContext.bootstrap.bootstrapId).toBe("boot-long-running");
      expect(validateDeviceOrderAction(session.role, "accept-order", "pending")).toEqual({
        ok: true,
      });
    }

    const afterHeartbeats = await runtimeStatus(store, credentials.deviceId, timeline.getNow());
    expect(afterHeartbeats.configVersion).toBe(configVersion);
    expect(bootstrapMayExecute("running")).toBe(false);
  });

  it("temporary network loss reconnects the existing runtime without pairing or reset", async () => {
    const timeline = await provisionPairAndAuthenticate();
    timeline.setNow(START + 60_000);
    await timeline.heartbeat.recordHeartbeat({ deviceId: timeline.credentials.deviceId });
    const status = await runtimeStatus(
      timeline.store,
      timeline.credentials.deviceId,
      timeline.getNow()
    );

    const contextStore = createRuntimeContextStore();
    const configManager = new RuntimeConfigurationManager();
    const boot = executeRuntimeBootstrap({
      credentials: timeline.credentials,
      status,
      bootstrapId: "boot-reconnect",
      assembledPhase: "running",
      configManager,
      store: contextStore,
    });

    let phase: BootstrapPhase = "running";
    phase = transition(phase, { type: "NETWORK_FAILURE" });
    expect(phase).toBe("degraded");
    phase = transition(phase, { type: "NETWORK_RECOVERED" });
    expect(phase).toBe("running");

    const reconnectAuth = await timeline.auth.authenticate(timeline.credentials);
    expect(reconnectAuth.ok).toBe(true);

    const reconnect = executeRuntimeReconciliation({
      credentials: timeline.credentials,
      status,
      currentContext: boot.context,
      lastStatusKey: boot.statusKey,
      configManager,
      store: contextStore,
    });
    expect(reconnect.kind).toBe("no-op");
    expect(boot.context.bootstrap.bootstrapId).toBe("boot-reconnect");
    expect(boot.context.instance.identity.deviceId).toBe(timeline.credentials.deviceId);
    expect(boot.context.instance.session.sessionId).toBe(timeline.credentials.tokenId);
    expect(await timeline.store.listTokensForDevice(timeline.credentials.deviceId)).toHaveLength(1);
  });

  it("configuration reload preserves runtime identity, credential, and operational continuity", async () => {
    const timeline = await provisionPairAndAuthenticate();
    timeline.setNow(START + 60_000);
    await timeline.heartbeat.recordHeartbeat({ deviceId: timeline.credentials.deviceId });
    const before = await runtimeStatus(
      timeline.store,
      timeline.credentials.deviceId,
      timeline.getNow()
    );

    const contextStore = createRuntimeContextStore();
    const configManager = new RuntimeConfigurationManager();
    const boot = executeRuntimeBootstrap({
      credentials: timeline.credentials,
      status: before,
      bootstrapId: "boot-config",
      assembledPhase: "running",
      configManager,
      store: contextStore,
    });

    const updated = await timeline.registry.updateScreenSettings(
      timeline.credentials.deviceId,
      RESTAURANT_ID,
      {
        screenConfig: {
          language: "en",
          displayDirection: "ltr",
          displayDensity: "compact",
        },
      }
    );
    expect(updated?.screenConfigRevision).toBe(2);

    const after = await runtimeStatus(
      timeline.store,
      timeline.credentials.deviceId,
      timeline.getNow()
    );
    const reload = executeRuntimeReconciliation({
      credentials: timeline.credentials,
      status: after,
      currentContext: boot.context,
      lastStatusKey: boot.statusKey,
      configManager,
      store: contextStore,
    });

    expect(reload.kind).toBe("published");
    if (reload.kind !== "published") return;
    expect(reload.context.configurationVersion).toBe("2");
    expect(reload.context.bootstrap.bootstrapId).toBe("boot-config");
    expect(reload.context.instance.identity.deviceId).toBe(timeline.credentials.deviceId);
    expect(reload.context.instance.session.sessionId).toBe(timeline.credentials.tokenId);
    expect((await timeline.auth.authenticate(timeline.credentials)).ok).toBe(true);
    expect(validateDeviceOrderAction(timeline.session.role, "mark-ready", "preparing")).toEqual({
      ok: true,
    });
  });

  it("device restart bootstraps with the existing credential and does not require pairing", async () => {
    const timeline = await provisionPairAndAuthenticate();
    timeline.setNow(START + 60_000);
    await timeline.heartbeat.recordHeartbeat({ deviceId: timeline.credentials.deviceId });
    const status = await runtimeStatus(
      timeline.store,
      timeline.credentials.deviceId,
      timeline.getNow()
    );

    const first = executeRuntimeBootstrap({
      credentials: timeline.credentials,
      status,
      bootstrapId: "boot-before-restart",
      assembledPhase: "running",
      configManager: new RuntimeConfigurationManager(),
      store: createRuntimeContextStore(),
    });

    const restartAuth = await timeline.auth.authenticate(timeline.credentials);
    expect(restartAuth.ok).toBe(true);

    const restarted = executeRuntimeBootstrap({
      credentials: timeline.credentials,
      status,
      bootstrapId: "boot-after-restart",
      assembledPhase: "running",
      configManager: new RuntimeConfigurationManager(),
      store: createRuntimeContextStore(),
    });

    expect(restarted.context.instance.identity.instanceId).not.toBe(
      first.context.instance.identity.instanceId
    );
    expect(restarted.context.instance.identity.deviceId).toBe(
      first.context.instance.identity.deviceId
    );
    expect(restarted.context.instance.session.sessionId).toBe(
      first.context.instance.session.sessionId
    );
    expect(await timeline.store.listTokensForDevice(timeline.credentials.deviceId)).toHaveLength(1);
  });

  it("credential regeneration invalidates the active runtime until the new code is paired", async () => {
    const timeline = await provisionPairAndAuthenticate();
    const previousCredentials = timeline.credentials;
    const regenerated = await timeline.registry.regenerateCredential(
      previousCredentials.deviceId,
      RESTAURANT_ID
    );
    expect(regenerated).not.toBeNull();

    expect(await timeline.auth.authenticate(previousCredentials)).toEqual({
      ok: false,
      code: "token_revoked",
    });

    const restored = await timeline.pairing.redeemPairingCode(regenerated!.pairingCode);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;

    const restoredCredentials = runtimeCredentials(
      restored.bootstrapCredentials,
      new Date(START + 60_000).toISOString()
    );
    const restoredAuth = await timeline.auth.authenticate(restoredCredentials);
    expect(restoredAuth.ok).toBe(true);
    expect(restoredCredentials.deviceId).toBe(previousCredentials.deviceId);
    expect(restoredCredentials.tokenId).not.toBe(previousCredentials.tokenId);
  });

  it("screen removal permanently invalidates runtime authentication and reconnection", async () => {
    const timeline = await provisionPairAndAuthenticate();
    const deleted = await timeline.registry.deleteDevice(
      timeline.credentials.deviceId,
      RESTAURANT_ID
    );
    expect(deleted).toBe(true);
    expect(
      await timeline.registry.getDevice(timeline.credentials.deviceId, RESTAURANT_ID)
    ).toBeNull();
    expect(await timeline.auth.authenticate(timeline.credentials)).toEqual({
      ok: false,
      code: "invalid_credentials",
    });
    expect(await timeline.store.getDevice(timeline.credentials.deviceId)).toBeNull();
  });
});
