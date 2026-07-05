import type {
  RoleLifecycleContext,
  RoleRuntimeHealth,
  RuntimeRoleDefinition,
} from "./runtimeRoleContract";
import type { OperationalScreenRuntimeContext } from "../runtimeTypes";
import type { BootstrapPhase } from "../runtimeTypes";

export function buildRoleRuntimeHealth(
  definition: RuntimeRoleDefinition,
  context: OperationalScreenRuntimeContext,
  bootstrapPhase: BootstrapPhase,
  platform: {
    heartbeatCount: number;
    reconnectCount: number;
    reconnecting: boolean;
  }
): RoleRuntimeHealth {
  const runtimeState = definition.resolveRuntimeStatus(
    bootstrapPhase,
    context,
    platform.reconnecting
  );
  const { metadata } = definition;

  return {
    runtimeState,
    role: metadata.role,
    version: import.meta.env.VITE_APP_VERSION ?? "web",
    configurationVersion: context.configVersion,
    capabilities: metadata.capabilities,
    operational: metadata.operational,
    blockedReason: metadata.operational ? null : (metadata.blockedReason ?? null),
    heartbeatCount: platform.heartbeatCount,
    reconnectCount: platform.reconnectCount,
  };
}

export function collectRoleDiagnostics(
  definition: RuntimeRoleDefinition,
  ctx: RoleLifecycleContext
): Record<string, unknown> {
  return {
    role: definition.metadata.role,
    operational: definition.metadata.operational,
    runtimeState: ctx.runtimeStatus,
    futurePrograms: definition.metadata.futurePrograms,
    configurationSchemaVersion: definition.metadata.configurationSchemaVersion,
    ...definition.collectDiagnostics(ctx),
  };
}
