import { useScreenRuntime } from "../OperationalScreenRuntimeProvider";
import KioskShell from "@/pages/kiosk/KioskShell";

/**
 * KIOSK-SCREEN-ACTIVATION-1 — capability presentation for presentation_kiosk.
 * Screen Runtime activates KioskShell; kiosk owns idle/language/ordering UX.
 * Reuses KioskOrderingClientHost via KioskShell — no second host.
 */
export function KioskRolePresentation() {
  const { context } = useScreenRuntime();
  if (!context) return null;

  const slug = context.identity.restaurantSlug?.trim() ?? "";
  if (!slug) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
        Restaurant slug unavailable — cannot activate kiosk ordering host.
      </div>
    );
  }

  const stationId =
    context.identity.deviceId.trim() ||
    `kiosk-${context.identity.restaurantId}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <KioskShell
        activation={{
          slug,
          stationId,
          restaurantId: context.identity.restaurantId,
          kioskId: context.identity.deviceId,
        }}
      />
    </div>
  );
}
