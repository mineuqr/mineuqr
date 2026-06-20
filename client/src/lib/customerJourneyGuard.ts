import type { DiningSessionRecoveryResult } from "@/lib/diningSessionRecovery";
import {
  clearCustomerJourney,
  hasPostSubmitSeal,
  loadCustomerJourney,
  type CustomerJourneyRecord,
} from "@/lib/customerJourneyStorage";
import { getNavigationEntryType } from "@/lib/customerJourneyNavigation";

export type PostSubmissionGuardResult = {
  blocked: boolean;
  journey: CustomerJourneyRecord | null;
  trackingPath?: string;
};

/**
 * Resolves whether ordering UI must be blocked for the current table journey.
 * Clears the lock when a new dining session (Session B) is detected.
 */
export function resolvePostSubmissionOrderingBlock(input: {
  slug: string;
  tableNumber: number;
  recovery: DiningSessionRecoveryResult;
  recoveryDone: boolean;
}): PostSubmissionGuardResult {
  const { slug, tableNumber, recovery, recoveryDone } = input;
  if (!slug || tableNumber <= 0 || !recoveryDone) {
    return { blocked: false, journey: null };
  }

  const journey = loadCustomerJourney(slug, tableNumber);
  if (!journey || journey.phase !== "tracking") {
    return { blocked: false, journey: null };
  }

  const trackingPath = `/menu/${slug}/order/${journey.trackingToken}`;

  if (
    recovery.session?.status === "open" &&
    journey.sessionToken &&
    recovery.session.sessionToken !== journey.sessionToken
  ) {
    clearCustomerJourney(slug, tableNumber);
    return { blocked: false, journey: null };
  }

  if (
    recovery.session?.status === "open" &&
    journey.sessionToken &&
    recovery.session.sessionToken === journey.sessionToken
  ) {
    return { blocked: true, journey, trackingPath };
  }

  const navType = getNavigationEntryType();
  if (navType === "back_forward" || navType === "reload") {
    return { blocked: true, journey, trackingPath };
  }

  if (hasPostSubmitSeal(slug, tableNumber)) {
    return { blocked: true, journey, trackingPath };
  }

  clearCustomerJourney(slug, tableNumber);
  return { blocked: false, journey: null };
}
