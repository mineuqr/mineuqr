/**
 * REALTIME-PUBLIC-TICKET-HARDENING-1
 * Unified credential authorization — gateway entrypoint.
 */

import type { RealtimeTicketClaims } from "@shared/realtime-platform";
import {
  isRealtimeTicketRevoked,
  verifyRealtimeTicket,
} from "./RealtimeTicketService";
import {
  isLegacyCustomerJwtEnabled,
  isOpaqueRealtimeTicket,
  lookupOpaqueRealtimeTicket,
} from "./RealtimeOpaqueTicketRegistry";

export type AuthorizeRealtimeCredentialResult =
  | { ok: true; claims: RealtimeTicketClaims }
  | {
      ok: false;
      code: "malformed" | "bad_signature" | "expired" | "revoked" | "not_found";
    };

/**
 * Opaque customer tickets → registry (sole ACL source).
 * Signed JWTs → staff/device (and legacy customer during migration).
 */
export function authorizeRealtimeCredential(
  token: string
): AuthorizeRealtimeCredentialResult {
  if (isOpaqueRealtimeTicket(token)) {
    const looked = lookupOpaqueRealtimeTicket(token);
    if (!looked.ok) {
      return {
        ok: false,
        code:
          looked.code === "not_found"
            ? "not_found"
            : looked.code === "revoked"
              ? "revoked"
              : looked.code === "expired"
                ? "expired"
                : "malformed",
      };
    }
    return { ok: true, claims: looked.claims };
  }

  const verified = verifyRealtimeTicket(token);
  if (!verified.ok) return verified;

  if (verified.claims.authMode === "customer_tracking") {
    if (!isLegacyCustomerJwtEnabled()) {
      return { ok: false, code: "malformed" };
    }
  }

  if (isRealtimeTicketRevoked(verified.claims.jti)) {
    return { ok: false, code: "revoked" };
  }

  return verified;
}
