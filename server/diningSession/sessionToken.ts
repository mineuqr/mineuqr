import { randomBytes } from "crypto";

/** URL-safe opaque token for dining session authority (TABLE-MANAGEMENT-1 D2). */
export function generateDiningSessionToken(): string {
  return randomBytes(24).toString("base64url");
}
