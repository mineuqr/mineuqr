import { useScreenRuntime } from "../OperationalScreenRuntimeProvider";
import KioskShell from "@/pages/kiosk/KioskShell";
import { KIOSK_DEFAULT_STATION_SCOPE } from "@/lib/ordering-client/kiosk/kioskPresentationLabels";

/**
 * KIOSK-SCREEN-ACTIVATION-1 — capability presentation for presentation_kiosk.
 * KIOSK-PRESENTATION-ADOPTION-1 — never expose deviceId (dev_*) as station label.
 * Screen Runtime activates KioskShell; kiosk owns idle/language/ordering UX.
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

  // Cart/station scope — not the technical device id (kept as kioskId only).
  const stationId = KIOSK_DEFAULT_STATION_SCOPE;

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
