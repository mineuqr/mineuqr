import type { DiningSessionRecoveryResult } from "@/lib/diningSessionRecovery";
import {
  clearCustomerJourney,
  isSameDocumentAsPostSubmitSeal,
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
 *
 * TABLE-QR-SAME-SESSION-FRESH-QR-NEW-ORDER-1 — an open Session token is not
 * a journey identity. A physical QR scan loads a new document and may start
 * another Order on the same Session. Back / Refresh / the submitted document
 * remain locked by navigation type and the post-submit seal.
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

  const navType = getNavigationEntryType();
  if (navType === "back_forward" || navType === "reload") {
    return { blocked: true, journey, trackingPath };
  }

  // Same document as Submit: Back, stale Menu / Cart / Review in this tab.
  if (isSameDocumentAsPostSubmitSeal(slug, tableNumber)) {
    return { blocked: true, journey, trackingPath };
  }

  // New document (physical QR) or a tab without the seal — new ordering attempt.
  // The server still decides Session reuse. No Order mutation happens here.
  clearCustomerJourney(slug, tableNumber);
  return { blocked: false, journey: null };
}
