import {
  useRuntimeBusiness,
  useRuntimeIdentity,
  useRuntimeRole,
  useScreenRuntime,
} from "../OperationalScreenRuntimeProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { screenTypeLabel } from "@/lib/operational-screen/screenLabels";
import WaiterShell from "@/pages/waiter/WaiterShell";

/**
 * OPERATIONAL-SCREEN-CATALOG-POLICY-1 — capability presentation for presentation_waiter.
 * WAITER-SCREEN-RUNTIME-ADOPTION-1 — business slice via Public Runtime API (useRuntimeBusiness).
 * WAITER-SCREEN-IDENTITY-PRESENTATION-1 — screen identity via useRuntimeIdentity / useRuntimeRole.
 * Screen Runtime activates WaiterShell; waiter channel owns tables/ordering UX.
 */
export function WaiterRolePresentation() {
  const { language } = useLanguage();
  const { context } = useScreenRuntime();
  const business = useRuntimeBusiness();
  const identity = useRuntimeIdentity();
  const role = useRuntimeRole();
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
          restaurantName: business.businessName,
          screenName: identity.displayIdentity,
          roleLabel: screenTypeLabel(role.role, language),
        }}
      />
    </div>
  );
}
