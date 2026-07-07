import { ScreenPairingProvider } from "@/components/operational-screen/ScreenPairingProvider";
import { DeviceActivationShell } from "@/components/device/DeviceActivationShell";

/** DEVICE-PROVISIONING-UX-2 — canonical device activation entry (/device). */
export default function DeviceActivationPage() {
  return (
    <ScreenPairingProvider>
      <DeviceActivationShell />
    </ScreenPairingProvider>
  );
}
