/**
 * COMMERCIAL-SNAPSHOT-RUNTIME-AUTHORITY-1
 * SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1
 *
 * Branch-only commercial entitlement resolution via Subscription Runtime.
 *
 * IF SubscriptionBinding exists → Live Plan capabilities (no freeze)
 * ELSE → Legacy Bridge ONLY
 */

import type { CommercialEntitlementsResult } from "@commercial/getCommercialEntitlements";
import { resolveOwnerEntitlements } from "../subscription-runtime";

/**
 * Canonical hub — delegates to Subscription Runtime Service (single owner).
 */
export async function getCommercialEntitlements(
  ownerId: number,
  now: Date = new Date()
): Promise<CommercialEntitlementsResult> {
  return resolveOwnerEntitlements(ownerId, { now });
}

export type { CommercialEntitlementsResult };
