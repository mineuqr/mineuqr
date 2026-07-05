import { ScreenErrorBoundary } from "@/components/operational-screen/ScreenErrorBoundary";
import { ScreenPairingProvider } from "@/components/operational-screen/ScreenPairingProvider";
import { PairingShell } from "@/components/operational-screen/PairingShell";
import { readOperationalScreenCredentials } from "@/lib/operational-screen/credentialStore";
import { spaNavigate } from "@/const";
import { useEffect } from "react";

export default function OperationalScreenPair() {
  const credentials = readOperationalScreenCredentials();

  useEffect(() => {
    if (credentials) {
      spaNavigate("/screen", { replace: true });
    }
  }, [credentials]);

  if (credentials) return null;

  return (
    <ScreenErrorBoundary>
      <ScreenPairingProvider>
        <PairingShell />
      </ScreenPairingProvider>
    </ScreenErrorBoundary>
  );
}
