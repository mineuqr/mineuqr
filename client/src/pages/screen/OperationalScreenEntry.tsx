import { readOperationalScreenCredentials } from "@/lib/operational-screen/credentialStore";
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
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { spaNavigate } from "@/const";

function OperationalScreenRuntime() {
  const { phase, context } = useScreenRuntime();
  const { retry } = useRuntimeActions();

  if (phase === "pairing_redirect" || phase === "revoked") {
    return null;
  }

  if (!context) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0e14]">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
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
  const credentials = readOperationalScreenCredentials();

  useEffect(() => {
    if (!credentials) {
      spaNavigate("/screen/pair", { replace: true });
    }
  }, [credentials]);

  if (!credentials) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0e14]">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
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
