import type { AccountClassification } from "@shared/accountClassification";

/** ADMIN-AUTH-1C — sole commercial KPI population rule. */
export const COMMERCIAL_POPULATION_CLASSIFICATION: AccountClassification = "COMMERCIAL";

export function isCommercialPopulationMember(user: {
  accountClassification: AccountClassification;
}): boolean {
  return user.accountClassification === COMMERCIAL_POPULATION_CLASSIFICATION;
}
