import { useScreenRuntime } from "./OperationalScreenRuntimeProvider";

export function ScreenDiagnosticsPanel() {
  const { context, diagnostics, roleHealth, roleDiagnostics } = useScreenRuntime();

  if (!context) return null;

  const runtimeCapabilities = context.runtimeCapabilities;
  const state = context.screenState;

  const snapshot = {
    screenState: state,
    operationalState: state.operationalState,
    connectivityState: state.connectivityState,
    businessReadiness: state.businessReadiness,
    maintenanceState: state.maintenanceState,
    warnings: state.warnings,
    errors: state.errors,
    connection: {
      phase: diagnostics.phase,
      lastError: diagnostics.lastError,
    },
    bootstrap: {
      bootstrapId: diagnostics.bootstrapId,
      bootedAt: context.bootstrap.bootedAt,
    },
    runtime: {
      deviceId: context.identity.deviceId,
      restaurantId: context.identity.restaurantId,
    },
    health: roleHealth,
    diagnostics: roleDiagnostics,
    fingerprint: context.fingerprint,
    capabilities: {
      negotiated: runtimeCapabilities,
      supportedFeatures: runtimeCapabilities.supportedFeatures,
      negotiationSummary: runtimeCapabilities.negotiationSummary,
      server: context.capabilities.server,
      client: context.capabilities.client,
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
