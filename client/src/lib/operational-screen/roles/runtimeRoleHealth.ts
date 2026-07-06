import type {
  RoleLifecycleContext,
  RoleRuntimeHealth,
  RuntimeRoleDefinition,
} from "./runtimeRoleContract";
import type { OperationalScreenRuntimeContext } from "../runtimeTypes";
import type { BootstrapPhase } from "../runtimeTypes";
import type { ConfigurationHealth } from "../configuration/runtimeConfigurationContract";
import type { CategoryFilterHealth } from "../category-filter/runtimeCategoryFilterContract";
import type { DisplayDensityHealth } from "../density/runtimeDisplayDensityContract";

export function buildRoleRuntimeHealth(
  definition: RuntimeRoleDefinition,
  context: OperationalScreenRuntimeContext,
  bootstrapPhase: BootstrapPhase,
  platform: {
    heartbeatCount: number;
    reconnectCount: number;
    reconnecting: boolean;
  },
  configurationHealth: ConfigurationHealth | null,
  categoryFilterHealth: CategoryFilterHealth | null,
  displayDensityHealth: DisplayDensityHealth | null
): RoleRuntimeHealth {
  const runtimeState = definition.resolveRuntimeStatus(
    bootstrapPhase,
    context,
    platform.reconnecting
  );
  const { metadata } = definition;
  const runtimeConfig = context.runtimeConfiguration;

  return {
    runtimeState,
    role: metadata.role,
    version: import.meta.env.VITE_APP_VERSION ?? "web",
    configurationVersion: context.configurationVersion,
    appliedVersion: context.lastAppliedVersion,
    configurationState: runtimeConfig.configurationState,
    configurationErrors: runtimeConfig.validationErrors,
    configurationUsedFallback: runtimeConfig.usedFallback,
    categoryFilterEnabled: categoryFilterHealth?.filterEnabled ?? false,
    categoryFilterVersion: categoryFilterHealth?.filterVersion ?? null,
    displayDensity: displayDensityHealth?.density ?? null,
    displayDensityVersion: displayDensityHealth?.densityVersion ?? null,
    capabilities: metadata.capabilities,
    operational: metadata.operational,
    blockedReason: metadata.operational ? null : (metadata.blockedReason ?? null),
    heartbeatCount: platform.heartbeatCount,
    reconnectCount: platform.reconnectCount,
    ...(configurationHealth
      ? {
          configurationVersion: configurationHealth.configurationVersion,
          appliedVersion: configurationHealth.appliedVersion,
        }
      : {}),
  };
}

export function collectRoleDiagnostics(
  definition: RuntimeRoleDefinition,
  ctx: RoleLifecycleContext,
  configurationHealth: ConfigurationHealth | null,
  categoryFilterHealth: CategoryFilterHealth | null,
  displayDensityHealth: DisplayDensityHealth | null
): Record<string, unknown> {
  return {
    role: definition.metadata.role,
    operational: definition.metadata.operational,
    runtimeState: ctx.runtimeStatus,
    futurePrograms: definition.metadata.futurePrograms,
    configurationSchemaVersion: definition.metadata.configurationSchemaVersion,
    configuration: configurationHealth,
    categoryFilter: categoryFilterHealth,
    displayDensity: displayDensityHealth,
    runtimeConfiguration: {
      version: ctx.context.runtimeConfiguration.version,
      state: ctx.context.configurationState,
      active: ctx.context.runtimeConfiguration.active,
      tracked: ctx.context.runtimeConfiguration.tracked,
      validationErrors: ctx.context.runtimeConfiguration.validationErrors,
    },
    resolvedDensity: {
      density: ctx.context.displayDensity,
      densityVersion: ctx.context.densityVersion,
      state: ctx.context.densityState,
    },
    ...definition.collectDiagnostics(ctx),
  };
}
