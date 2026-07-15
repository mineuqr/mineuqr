import { useScreenRuntime } from "../OperationalScreenRuntimeProvider";
import WaiterShell from "@/pages/waiter/WaiterShell";

/**
 * OPERATIONAL-SCREEN-CATALOG-POLICY-1 — capability presentation for presentation_waiter.
 * Screen Runtime activates WaiterShell; waiter channel owns tables/ordering UX.
 */
export function WaiterRolePresentation() {
  const { context } = useScreenRuntime();
  if (!context) return null;

  const slug = context.identity.restaurantSlug?.trim() ?? "";
  if (!slug) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
        Restaurant slug unavailable — cannot activate waiter ordering host.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WaiterShell
        activation={{
          slug,
          restaurantId: context.identity.restaurantId,
          restaurantName: context.business.businessName,
        }}
      />
    </div>
  );
}
