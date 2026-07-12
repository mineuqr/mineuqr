import type { OperationalScreenCredentials } from "../credentialStore";
import { runtimeContextFactory } from "../RuntimeContextFactory";
import type { RuntimeConfigurationManager } from "../configuration/runtimeConfigurationManager";
import { collectRuntimeFingerprint } from "../runtimeFingerprint";
import type { BootstrapPhase, OperationalScreenRuntimeContext, RuntimeGetStatusResponse } from "../runtimeTypes";
import { buildStatusReconciliationKey } from "./runtimeReconciliationPolicy";
import { publishSnapshotIfChanged } from "./runtimePublicationPolicy";
import type { RuntimeContextStore } from "../runtimeContextStore";

export type RuntimeBootstrapInput = {
  credentials: OperationalScreenCredentials;
  status: RuntimeGetStatusResponse;
  bootstrapId: string;
  assembledPhase: BootstrapPhase;
  configManager: RuntimeConfigurationManager;
  store: RuntimeContextStore;
};

export type RuntimeBootstrapResult = {
  context: OperationalScreenRuntimeContext;
  statusKey: string;
  snapshotPublished: true;
  contextPublished: true;
};

/**
 * RUNTIME-RECONCILIATION-ARCHITECTURE-1 — single bootstrap execution.
 * Invoked exactly once when bootstrap phase is validating and status is available.
 */
export function executeRuntimeBootstrap(input: RuntimeBootstrapInput): RuntimeBootstrapResult {
  const fingerprint = collectRuntimeFingerprint(input.bootstrapId);
  const instance = runtimeContextFactory.resolve({
    credentials: input.credentials,
    status: input.status,
    bootstrapId: input.bootstrapId,
  });
  const runtimeConfiguration = runtimeContextFactory.loadConfiguration(
    input.status,
    input.configManager
  );
  const snapshot = input.configManager.getSnapshot();
  const nextContext = runtimeContextFactory.buildRuntimeContext({
    instance,
    bootstrapId: input.bootstrapId,
    phase: input.assembledPhase,
    runtimeHealth: input.status.health,
    fingerprint,
    runtimeConfiguration,
    lastAppliedVersion: snapshot.lastAppliedVersion,
  });

  publishSnapshotIfChanged(input.store, null, instance, "bootstrap");
  const contextWithInstance = { ...nextContext, instance: input.store.getCurrentSnapshot() ?? instance };

  return {
    context: contextWithInstance,
    statusKey: buildStatusReconciliationKey(input.status),
    snapshotPublished: true,
    contextPublished: true,
  };
}
