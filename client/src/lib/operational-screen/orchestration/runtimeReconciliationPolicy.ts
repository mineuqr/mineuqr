import type { OperationalScreenRuntimeContext, RuntimeGetStatusResponse } from "../runtimeTypes";
import type { FrozenRuntimeInstanceContext } from "../runtimeInstanceContext";

/**
 * RUNTIME-RECONCILIATION-ARCHITECTURE-1 — deterministic reconciliation keys.
 *
 * Pure comparison policy. The orchestrator consults these keys before any
 * factory invocation or publication. Identical keys mean no-op.
 */

export function buildStatusReconciliationKey(status: RuntimeGetStatusResponse): string {
  return JSON.stringify({
    configVersion: status.configVersion,
    deviceId: status.device.deviceId,
    role: status.device.role,
    displayName: status.device.displayName,
    restaurantId: status.device.restaurantId,
    branchId: status.device.branchId,
    deviceStatus: status.device.status,
    hasActiveToken: status.health.hasActiveToken,
    healthStatus: status.health.status,
    healthOperational: status.health.operational,
    healthPresence: status.health.presence,
    screenConfig: status.screenConfig,
  });
}

export function buildInstanceReconciliationKey(instance: FrozenRuntimeInstanceContext): string {
  return JSON.stringify({
    deviceId: instance.identity.deviceId,
    displayIdentity: instance.identity.displayIdentity,
    configRevision: instance.configuration.configRevision,
    role: instance.role.role,
    canAccessKitchenQueue: instance.role.permissions.canAccessKitchenQueue,
    canAccessPrintMonitor: instance.role.permissions.canAccessPrintMonitor,
    canExecuteOrderActions: instance.role.permissions.canExecuteOrderActions,
    sessionId: instance.session.sessionId,
    lastHeartbeat: instance.session.lastHeartbeat,
    screenStatus: instance.screen.status,
    settings: instance.configuration.settings,
  });
}

export function buildRuntimeContextReconciliationKey(
  context: OperationalScreenRuntimeContext
): string {
  return JSON.stringify({
    instance: buildInstanceReconciliationKey(context.instance),
    configurationVersion: context.configurationVersion,
    configurationState: context.configurationState,
    lastAppliedVersion: context.lastAppliedVersion,
    runtimeStatus: context.runtimeStatus,
    presentation: context.presentation,
    bootstrapId: context.bootstrap.bootstrapId,
  });
}

export function statusReconciliationChanged(
  previousKey: string | null,
  status: RuntimeGetStatusResponse
): boolean {
  if (previousKey == null) return true;
  return previousKey !== buildStatusReconciliationKey(status);
}

export function snapshotReconciliationChanged(
  previous: FrozenRuntimeInstanceContext | null,
  next: FrozenRuntimeInstanceContext
): boolean {
  if (previous == null) return true;
  return buildInstanceReconciliationKey(previous) !== buildInstanceReconciliationKey(next);
}

export function runtimeContextReconciliationChanged(
  previous: OperationalScreenRuntimeContext | null,
  next: OperationalScreenRuntimeContext
): boolean {
  if (previous == null) return true;
  return (
    buildRuntimeContextReconciliationKey(previous) !== buildRuntimeContextReconciliationKey(next)
  );
}

export function configurationRevisionChanged(
  lastAppliedVersion: string | null,
  incomingVersion: string
): boolean {
  return lastAppliedVersion != null && lastAppliedVersion !== incomingVersion;
}
