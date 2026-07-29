/**
 * REALTIME-PLATFORM-FOUNDATION-1
 * Ticket claims (shared shape). Signing/verification is server-only.
 */

import type { RealtimeAuthMode, RealtimeChannel } from "./channels";
import type { RealtimeServerCapabilities } from "./protocol";

export type RealtimeTicketClaims = {
  /** Ticket id (jti). */
  jti: string;
  restaurantId: number;
  authMode: RealtimeAuthMode;
  /** Allowed channels after ACL intersect. */
  channels: RealtimeChannel[];
  protocolVersion: number;
  /** Subject: userId | deviceId | trackingToken hash. */
  sub: string;
  /** Optional device bind. */
  deviceId?: string;
  /** Optional customer tracking scope (order id) — server ACL only. */
  orderId?: number;
  /**
   * REALTIME-CUSTOMER-TRACKING-ADOPTION-1 — opaque tracking token hash.
   * Present only for customer_tracking; used to sanitize public SSE payloads.
   */
  trackingRef?: string;
  iat: number;
  exp: number;
  capabilities: Pick<
    RealtimeServerCapabilities,
    | "heartbeat"
    | "reconnect"
    | "pollFallback"
    | "broadcastBridge"
    | "lastEventIdResume"
  >;
};

export type RealtimeTicketMintResult = {
  token: string;
  expiresAt: string;
  claims: RealtimeTicketClaims;
  negotiated: RealtimeServerCapabilities;
  ssePath: string;
};
