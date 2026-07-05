import { useScreenRuntime } from "./OperationalScreenRuntimeProvider";
import { getRoleCapabilities } from "@/lib/operational-screen/runtimeCapabilities";

export function ScreenDiagnosticsPanel() {
  const { phase, context, degraded, lastError, diagnostics, roleHealth, roleDiagnostics } =
    useScreenRuntime();

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
    heartbeat: { failures: diagnostics.heartbeatFailures, statusQueryState: diagnostics.statusQueryState },
    fingerprint: context?.fingerprint ?? null,
    configuration: {
      configVersion: context?.configVersion ?? null,
      presentation: context?.presentation ?? null,
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
