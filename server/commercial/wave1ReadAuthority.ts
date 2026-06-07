import { parseStoredUtcInstant } from "@shared/utils/timezone";
import { getTrialEndDate, isSubscriptionActive } from "../db";
import { getCommercialEntitlements } from "./getCommercialEntitlements";

/** Legacy-compatible trial status shape (subscription.checkTrialStatus). */
export type LegacyTrialStatusRead = {
  isActive: boolean;
  trialEndDate: Date | null;
};

/**
 * PG-1C.4C Wave 1 — trial status read via CommercialContext authority.
 *
 * Primary: getCommercialEntitlements → context dates + plan resolution.
 * Parity fallback: when account-level context is NONE but restaurant-scoped
 * rows exist (self-service register), legacy helpers preserve behavior.
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

