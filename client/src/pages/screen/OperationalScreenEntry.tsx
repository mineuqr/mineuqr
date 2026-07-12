import { useOperationalScreenCredentials } from "@/lib/operational-screen/useOperationalScreenCredentials";
import { ScreenErrorBoundary } from "@/components/operational-screen/ScreenErrorBoundary";
import { ScreenRuntimeProvider } from "@/components/operational-screen/ScreenRuntimeProvider";
import {
  OperationalScreenRuntimeProvider,
  useRuntimeActions,
  useScreenRuntime,
} from "@/components/operational-screen/OperationalScreenRuntimeProvider";
import { OperationalScreenShell } from "@/components/operational-screen/OperationalScreenShell";
import { RuntimeRoleHost } from "@/components/operational-screen/RuntimeRoleHost";
import { ScreenDiagnosticsPanel } from "@/components/operational-screen/ScreenDiagnosticsPanel";
import { PairingShell } from "@/components/operational-screen/PairingShell";
import { ScreenPairingProvider } from "@/components/operational-screen/ScreenPairingProvider";
import { ScreenBootLoadingPanel } from "@/components/operational-screen/pairing/ScreenBootLoadingPanel";
import { resolveScreenBootLoadingMessage } from "@/lib/operational-screen/pairing/screenBootPresentation";

function OperationalScreenRuntime() {
  const { phase, context, instanceContext } = useScreenRuntime();
  const { retry } = useRuntimeActions();

  if (phase === "pairing_redirect" || phase === "revoked") {
    return <ScreenBootLoadingPanel message={resolveScreenBootLoadingMessage("loading", null)} />;
  }

  if (!context) {
    const role = instanceContext?.role.role ?? null;
    return <ScreenBootLoadingPanel message={resolveScreenBootLoadingMessage(phase, role)} />;
  }

  const showRetry =
    context.screenState.operationalState === "disconnected" ||
    context.screenState.operationalState === "degraded" ||
    context.screenState.connectivityState === "disconnected" ||
    context.screenState.connectivityState === "reconnecting";

  return (
    <OperationalScreenShell>
      <RuntimeRoleHost />
      {import.meta.env.DEV ? <ScreenDiagnosticsPanel /> : null}
      {showRetry ? (
        <div className="mt-4 text-center">
          <button type="button" className="text-sm text-primary underline" onClick={retry}>
            Retry connection
          </button>
        </div>
      ) : null}
    </OperationalScreenShell>
  );
}

export default function OperationalScreenEntry() {
  const credentials = useOperationalScreenCredentials();

  if (!credentials) {
    return (
      <ScreenErrorBoundary>
        <ScreenPairingProvider>
          <PairingShell />
        </ScreenPairingProvider>
      </ScreenErrorBoundary>
    );
  }

  return (
    <ScreenErrorBoundary>
      <ScreenRuntimeProvider credentials={credentials}>
        <OperationalScreenRuntimeProvider credentials={credentials}>
          <OperationalScreenRuntime />
        </OperationalScreenRuntimeProvider>
      </ScreenRuntimeProvider>
    </ScreenErrorBoundary>
  );
}
