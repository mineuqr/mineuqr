import { getSubscriptionsByUser } from "../db";
import {
  pickUserLevelSubscription,
  type UserSubscriptionRow,
} from "../subscriptionResolver";
import { commercialReadService } from "./CommercialReadService";

/**
 * AUTHORITY-CLEANUP-1 — single definition of owner account subscription authority.
 * Aligned with CommercialReadService / Operations UI / metrics.
 */

/** Account-scoped row (`restaurantId = 0`), canonical pick. May be expired. */
export async function getOwnerAccountSubscriptionRow(
  userId: number,
  now: Date = new Date()
): Promise<UserSubscriptionRow | undefined> {
  const rows = await getSubscriptionsByUser(userId);
  return pickUserLevelSubscription(rows, now);
}

/**
 * True when CRS considers the owner commercially entitled (active account subscription).
 * Used for create guards — matches Operations UI `isOwnerEntitled`.
 */
export async function ownerHasEntitledAccountSubscription(
  userId: number,
  now: Date = new Date()
): Promise<boolean> {
  const state = await commercialReadService.getOwnerCommercialState(userId, now);
  return state.commercialStatus.isEntitled;
}
