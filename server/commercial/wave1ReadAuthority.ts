import { parseStoredUtcInstant } from "@shared/utils/timezone";
import { getTrialEndDate, isSubscriptionActive } from "../db";
import { getCommercialEntitlements } from "./getCommercialEntitlements";

/** Legacy-compatible trial status shape (subscription.checkTrialStatus). */
export type LegacyTrialStatusRead = {
  isActive: boolean;
  trialEndDate: Date | null;
};

/**
 * PG-1C.4C Wave 1 — trial status read via commercial entitlement authority.
 *
 * COMMERCIAL-SNAPSHOT-RUNTIME-AUTHORITY-1:
 * Uses branch resolver (Snapshot | Legacy). Lifecycle fallbacks remain only
 * when account-level context is NONE (restaurant-scoped historical rows).
 */
export async function resolveTrialStatusRead(
  userId: number,
  now: Date = new Date()
): Promise<LegacyTrialStatusRead> {
  const { context, entitlements } = await getCommercialEntitlements(userId, now);

  const isActive =
    entitlements.plan !== "NONE"
      ? true
      : await isSubscriptionActive(userId);

  const trialEndFromContext = context.subscription?.trialEndsAt
    ? parseStoredUtcInstant(context.subscription.trialEndsAt)
    : null;
  const trialEndDate = trialEndFromContext ?? (await getTrialEndDate(userId));

  return { isActive, trialEndDate };
}

