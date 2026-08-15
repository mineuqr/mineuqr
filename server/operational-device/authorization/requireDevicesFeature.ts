/**
 * COMMERCIAL-ENTITLEMENT-ENFORCEMENT-REPAIR-1
 * TRPC adapter around the canonical commercial entitlement hub.
 * Does not resolve capabilities itself.
 */

import { TRPCError } from "@trpc/server";
import { requireFeature } from "../../subscription-runtime";

const FORBIDDEN_MESSAGE = "غير مصرح بالوصول";

/**
 * Fail-closed commercial gate for Screen / Device Management.
 * Canonical key: devices (cap.device.management). Not kitchen.
 */
export async function requireDevicesFeature(
  userId: number,
  now?: Date
): Promise<void> {
  try {
    await requireFeature(userId, "devices", now);
  } catch {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: FORBIDDEN_MESSAGE,
    });
  }
}
