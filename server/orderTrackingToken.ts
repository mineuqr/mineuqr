import { randomBytes } from "crypto";

/** URL-safe opaque token for customer order tracking (PR-CUX-1A). */
export function generateOrderTrackingToken(): string {
  return randomBytes(24).toString("base64url");
}
