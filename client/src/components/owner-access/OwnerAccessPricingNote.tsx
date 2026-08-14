/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1
 * Pricing-page note: simulation is not a charge and does not create checkout.
 */

import { useLanguage } from "@/contexts/LanguageContext";
import { useOwnerAccessMode } from "@/hooks/useOwnerAccessMode";

export function OwnerAccessPricingNote() {
  const { t } = useLanguage();
  const { isOwner, data } = useOwnerAccessMode();

  if (!isOwner || !data) return null;

  const simulating = data.mode === "SIMULATED_PLAN";
  return (
    <div
      className="mb-6 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
      data-testid="owner-access-pricing-note"
    >
      <p className="font-semibold">{t("ownerAccess.title")}</p>
      <p className="mt-1">
        {simulating
          ? t("ownerAccess.simulating").replace(
              "{plan}",
              data.simulatedPlanName ?? data.simulatedPlanCode ?? ""
            )
          : t("ownerAccess.fullPlatform")}
      </p>
      <p className="mt-1 font-medium">{t("ownerAccess.simulationNoCharge")}</p>
    </div>
  );
}

export function useOwnerAccessSuppressesCheckout(): boolean {
  const { isOwner, data } = useOwnerAccessMode();
  return isOwner && data != null;
}
