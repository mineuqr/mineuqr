import type { OperationalScreenCredentials } from "../credentialStore";
import { runtimeContextFactory } from "../RuntimeContextFactory";
import type { RuntimeConfigurationManager } from "../configuration/runtimeConfigurationManager";
import type { OperationalScreenRuntimeContext, RuntimeGetStatusResponse } from "../runtimeTypes";
import {
  buildStatusReconciliationKey,
  configurationRevisionChanged,
  statusReconciliationChanged,
} from "./runtimeReconciliationPolicy";
import { publishContextIfChanged, publishSnapshotIfChanged } from "./runtimePublicationPolicy";
import type { RuntimeContextStore } from "../runtimeContextStore";

export type RuntimeReconciliationInput = {
  credentials: OperationalScreenCredentials;
  status: RuntimeGetStatusResponse;
  currentContext: OperationalScreenRuntimeContext;
  lastStatusKey: string | null;
  configManager: RuntimeConfigurationManager;
  store: RuntimeContextStore;
};

export type RuntimeReconciliationResult =
  | { kind: "no-op"; statusKey: string }
  | {
      kind: "published";
      statusKey: string;
      context: OperationalScreenRuntimeContext;
      snapshotPublished: boolean;
      contextPublished: boolean;
    };

/**
 * RUNTIME-RECONCILIATION-ARCHITECTURE-1 — event-driven reconciliation.
 *
 * Executes only when status reconciliation key changed. Publication is conditional
 * on snapshot/context reconciliation keys — identical state is never published.
 */
export function executeRuntimeReconciliation(
  input: RuntimeReconciliationInput
): RuntimeReconciliationResult {
  const statusKey = buildStatusReconciliationKey(input.status);

  if (!statusReconciliationChanged(input.lastStatusKey, input.status)) {
    return { kind: "no-op", statusKey };
  }

  const versionChanged = configurationRevisionChanged(
    input.configManager.getSnapshot().lastAppliedVersion,
    input.status.configVersion
  );

  const previousSnapshot = input.store.getCurrentSnapshot() ?? input.currentContext.instance;
  let nextContext: OperationalScreenRuntimeContext;

  if (versionChanged) {
    nextContext = runtimeContextFactory.applyConfigurationReload(
      input.currentContext,
      input.status,
      input.credentials,
      input.configManager
    );
  } else {
    const refreshed = runtimeContextFactory.refresh(
      {
        credentials: input.credentials,
        status: input.status,
        bootstrapId: input.currentContext.bootstrap.bootstrapId,
        lastHeartbeat: input.currentContext.instance.session.lastHeartbeat,
      },
      previousSnapshot
    );
    nextContext = {
      ...input.currentContext,
      instance: refreshed,
      runtimeStatus: input.status.health,
      identity: {
        ...input.currentContext.identity,
        displayName: refreshed.identity.displayIdentity,
      },
    };
  }

  const snapshotResult = publishSnapshotIfChanged(
    input.store,
    previousSnapshot,
    nextContext.instance,
    versionChanged ? "configuration_reload" : "manual_refresh"
  );

  const contextWithInstance = {
    ...nextContext,
    instance: snapshotResult.snapshot ?? nextContext.instance,
  };

  const contextResult = publishContextIfChanged(input.currentContext, contextWithInstance);

  if (!snapshotResult.published && !contextResult.published) {
    return { kind: "no-op", statusKey };
  }

  return {
    kind: "published",
    statusKey,
    context: contextResult.context ?? contextWithInstance,
    snapshotPublished: snapshotResult.published,
    contextPublished: contextResult.published,
  };
}

export type HeartbeatReconciliationInput = {
  currentContext: OperationalScreenRuntimeContext;
  heartbeatAt: string;
  store: RuntimeContextStore;
};

export type HeartbeatReconciliationResult =
  | { kind: "no-op" }
  | { kind: "published"; context: OperationalScreenRuntimeContext };

/**
 * Heartbeat reconciliation — publishes only when lastHeartbeat changes.
 */
export function executeHeartbeatReconciliation(
  input: HeartbeatReconciliationInput
): HeartbeatReconciliationResult {
  const previousSnapshot = input.store.getCurrentSnapshot() ?? input.currentContext.instance;
  const withHeartbeat = runtimeContextFactory.withHeartbeat(previousSnapshot, input.heartbeatAt);

  const snapshotResult = publishSnapshotIfChanged(
    input.store,
    previousSnapshot,
    withHeartbeat,
    "heartbeat_refresh"
  );

  if (!snapshotResult.published) {
    return { kind: "no-op" };
  }

  const nextContext = {
    ...input.currentContext,
    instance: withHeartbeat,
  };

  const contextResult = publishContextIfChanged(input.currentContext, nextContext);
  if (!contextResult.published) {
    return { kind: "no-op" };
  }

  return { kind: "published", context: contextResult.context! };
}
