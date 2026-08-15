/** EXEC-5 — display helpers for OwnerCommercialState (format only, no authority derivation). */

type CommercialDisplay = {
  planCode: string;
  planName: string | null;
  subscriptionStatus: string | null;
  subscriptionId: number | null;
  planId: string | number | null;
  billingCycle: string | null;
  currentPeriodEnd: string | null;
  commercialStatus: { isEntitled: boolean; invoiceEligible: boolean };
  trialStatus: { isTrial: boolean };
};

export function isOwnerEntitled(commercial: CommercialDisplay): boolean {
  return commercial.commercialStatus.isEntitled;
}

export function ownerSubscriptionStatus(commercial: CommercialDisplay): string {
  if (commercial.trialStatus.isTrial) return "trial";
  return commercial.subscriptionStatus ?? "inactive";
}

export function ownerPlanLabel(commercial: CommercialDisplay): string {
  if (commercial.planName) return commercial.planName;
  if (commercial.planCode && commercial.planCode !== "NONE") return commercial.planCode;
  return "-";
}
