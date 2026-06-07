import { getCommercialEntitlementsFromContext } from "@commercial/getCommercialEntitlements";
import type { CommercialEntitlementsResult } from "@commercial/getCommercialEntitlements";
import { buildCommercialContextFromDb } from "./buildCommercialContextFromDb";

/**
 * Read-only entitlements service (PG-1C.2E).
 *
 * Runtime records → CommercialContext adapter → resolveCommercialEntitlements → output
 */
export async function getCommercialEntitlements(
  ownerId: number,
  now: Date = new Date()
): Promise<CommercialEntitlementsResult> {
  const context = await buildCommercialContextFromDb(ownerId, now);
  return getCommercialEntitlementsFromContext(context);
}

export type { CommercialEntitlementsResult };
