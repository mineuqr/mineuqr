import { useScreenRuntime } from "./OperationalScreenRuntimeProvider";
import { getRoleCapabilities } from "@/lib/operational-screen/runtimeCapabilities";

export function ScreenDiagnosticsPanel() {
  const {
    phase,
    context,
    degraded,
    lastError,
    diagnostics,
    roleHealth,
    roleDiagnostics,
    configurationHealth,
    categoryFilterHealth,
    categoryFilter,
    displayDensity,
    displayDensityHealth,
  } = useScreenRuntime();

  const roleCapabilities = context ? getRoleCapabilities(context.identity.role) : null;

  const snapshot = {
    connection: { phase, degraded, lastError },
    bootstrap: { phase, bootstrapId: diagnostics.bootstrapId, bootedAt: context?.bootstrap.bootedAt ?? null },
    runtime: {
      deviceId: context?.identity.deviceId ?? null,
      role: context?.identity.role ?? null,
      restaurantId: context?.identity.restaurantId ?? null,
    },
    roleHealth,
    roleDiagnostics,
    configurationHealth,
    categoryFilter,
    categoryFilterHealth,
    displayDensity,
    displayDensityHealth,
    densityState: context?.densityState ?? null,
    densityVersion: context?.densityVersion ?? null,
    resolvedDensity: context?.displayDensity ?? null,
    runtimeConfiguration: context?.runtimeConfiguration ?? null,
    configurationState: context?.configurationState ?? null,
    configurationVersion: context?.configurationVersion ?? null,
    lastAppliedVersion: context?.lastAppliedVersion ?? null,
    heartbeat: { failures: diagnostics.heartbeatFailures, statusQueryState: diagnostics.statusQueryState },
    fingerprint: context?.fingerprint ?? null,
    configuration: {
      configVersion: context?.configVersion ?? null,
      presentation: context?.presentation ?? null,
      tracked: context?.runtimeConfiguration?.tracked ?? null,
    },
    status: context?.runtimeStatus ?? null,
    capabilities: {
      role: roleCapabilities,
      server: context?.capabilities.server ?? null,
      client: context?.capabilities.client ?? null,
    },
  };

  return (
    <details className="mt-4 rounded-lg border border-border/40 bg-muted/20 p-3 text-xs">
      <summary className="cursor-pointer font-medium">Runtime diagnostics</summary>
      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-[10px] text-muted-foreground">
        {JSON.stringify(snapshot, null, 2)}
      </pre>
    </details>
  );
}
