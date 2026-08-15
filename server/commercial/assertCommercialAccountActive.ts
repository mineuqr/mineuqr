/**
 * COMMERCIAL-FROZEN-ACCOUNT-STATE-1
 * Server-side FROZEN guard. Uses the entitlement hub; does not resolve capabilities itself.
 */

import { TRPCError } from "@trpc/server";
import { resolveOwnerEntitlements } from "../subscription-runtime";
import { isFrozenCommercialAccountState } from "../subscription-runtime/commercialAccountState";

export const COMMERCIAL_ACCOUNT_FROZEN_CODE = "COMMERCIAL_ACCOUNT_FROZEN" as const;
export const COMMERCIAL_ACCOUNT_FROZEN_MESSAGE = "غير مصرح بالوصول";

export async function assertCommercialAccountActive(
  userId: number,
  now?: Date
): Promise<void> {
  try {
    const result = await resolveOwnerEntitlements(userId, { now });
    const state = (result.meta as { commercialAccountState?: string } | undefined)
      ?.commercialAccountState;
    if (isFrozenCommercialAccountState(state)) {
      const cause = new Error(COMMERCIAL_ACCOUNT_FROZEN_CODE);
      (cause as Error & { code: string }).code = COMMERCIAL_ACCOUNT_FROZEN_CODE;
      throw new TRPCError({
        code: "FORBIDDEN",
        message: COMMERCIAL_ACCOUNT_FROZEN_MESSAGE,
        cause,
      });
    }
  } catch (err) {
    if (err instanceof TRPCError) throw err;
    throw new TRPCError({
      code: "FORBIDDEN",
      message: COMMERCIAL_ACCOUNT_FROZEN_MESSAGE,
    });
  }
}

export function isFrozenBlockedCommercialMutation(path: string | undefined): boolean {
  if (!path) return false;
  return FROZEN_BLOCKED_MUTATION_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix)
  );
}

/** Commercial management mutations. Renewal / billing / auth paths are not listed. */
export const FROZEN_BLOCKED_MUTATION_PREFIXES = [
  "restaurant.create",
  "restaurant.update",
  "restaurant.delete",
  "restaurant.uploadImage",
  "category.create",
  "category.update",
  "category.delete",
  "category.uploadImage",
  "menuItem.create",
  "menuItem.update",
  "menuItem.delete",
  "menuItem.uploadImage",
  "offer.create",
  "offer.update",
  "offer.delete",
  "offer.uploadImage",
  "offer.deleteImage",
  "session.markPaid",
  "session.markComplimentary",
  "session.close",
  "order.updateStatus",
  "order.placeAsWaiter",
  "order.staffSettleCounterPickup",
  "order.staffCancelCounterPickup",
  "table.create",
  "table.update",
  "table.delete",
  "holiday.create",
  "holiday.update",
  "holiday.delete",
  "operationalDevice.management.",
  "operationalDevice.fleet.",
  "printerManagement.",
] as const;
