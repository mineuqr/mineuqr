/**
 * REALTIME-PLATFORM-FOUNDATION-1
 * HMAC-signed realtime tickets — short-lived, channel-scoped.
 */

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { ENV } from "../../_core/env";
import { incRealtimeMetric } from "../observability/realtimeMetrics";
import {
  DEFAULT_SERVER_CAPABILITIES,
  getRealtimeChannelDefinition,
  isRealtimeChannel,
  negotiateRealtimeCapabilities,
  type RealtimeAuthMode,
  type RealtimeChannel,
  type RealtimeClientCapabilities,
  type RealtimeTicketClaims,
  type RealtimeTicketMintResult,
} from "@shared/realtime-platform";

function ticketSecret(): string {
  return (
    process.env.REALTIME_TICKET_SECRET?.trim() ||
    `${ENV.cookieSecret}:realtime-platform-v1`
  );
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64urlJson(value: unknown): string {
  return b64url(JSON.stringify(value));
}

function sign(payloadB64: string): string {
  return b64url(
    createHmac("sha256", ticketSecret()).update(payloadB64).digest()
  );
}

export function filterChannelsForAuthMode(
  requested: readonly string[],
  authMode: RealtimeAuthMode
): RealtimeChannel[] {
  const out: RealtimeChannel[] = [];
  for (const raw of requested) {
    if (!isRealtimeChannel(raw)) continue;
    const def = getRealtimeChannelDefinition(raw);
    if (!def.authModes.includes(authMode)) continue;
    out.push(raw);
  }
  return out;
}

export type MintRealtimeTicketInput = {
  restaurantId: number;
  authMode: RealtimeAuthMode;
  sub: string;
  channels: readonly string[];
  clientCapabilities?: Partial<RealtimeClientCapabilities>;
  deviceId?: string;
  orderId?: number;
  /** Opaque tracking token hash for customer_tracking tickets. */
  trackingRef?: string;
  ttlSeconds?: number;
};

export function mintRealtimeTicket(
  input: MintRealtimeTicketInput
): RealtimeTicketMintResult {
  const negotiation = negotiateRealtimeCapabilities(input.clientCapabilities);
  if (!negotiation.ok) {
    throw new Error(negotiation.message);
  }

  const channels = filterChannelsForAuthMode(input.channels, input.authMode);
  if (channels.length === 0) {
    throw new Error("No authorized realtime channels");
  }

  const now = Math.floor(Date.now() / 1000);
  const ttl =
    input.ttlSeconds ??
    negotiation.negotiated.ticketTtlSeconds ??
    DEFAULT_SERVER_CAPABILITIES.ticketTtlSeconds;

  const claims: RealtimeTicketClaims = {
    jti: randomUUID(),
    restaurantId: input.restaurantId,
    authMode: input.authMode,
    channels,
    protocolVersion: negotiation.negotiated.protocolVersion,
    sub: input.sub,
    deviceId: input.deviceId,
    orderId: input.orderId,
    trackingRef: input.trackingRef,
    iat: now,
    exp: now + ttl,
    capabilities: {
      heartbeat: negotiation.negotiated.heartbeat,
      reconnect: negotiation.negotiated.reconnect,
      pollFallback: negotiation.negotiated.pollFallback,
      broadcastBridge: negotiation.negotiated.broadcastBridge,
      lastEventIdResume: negotiation.negotiated.lastEventIdResume,
    },
  };

  const payload = b64urlJson(claims);
  const token = `${payload}.${sign(payload)}`;
  incRealtimeMetric("ticketsIssued");

  return {
    token,
    expiresAt: new Date(claims.exp * 1000).toISOString(),
    claims,
    negotiated: negotiation.negotiated,
    ssePath: "/api/realtime/sse",
  };
}

export type VerifyRealtimeTicketResult =
  | { ok: true; claims: RealtimeTicketClaims }
  | { ok: false; code: "malformed" | "bad_signature" | "expired" };

export function verifyRealtimeTicket(token: string): VerifyRealtimeTicketResult {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, code: "malformed" };
  }
  const [payload, sig] = parts;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, code: "bad_signature" };
  }

  let claims: RealtimeTicketClaims;
  try {
    const json = Buffer.from(
      payload.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8");
    claims = JSON.parse(json) as RealtimeTicketClaims;
  } catch {
    return { ok: false, code: "malformed" };
  }

  if (!claims?.restaurantId || !claims.exp || !Array.isArray(claims.channels)) {
    return { ok: false, code: "malformed" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (claims.exp < now) {
    return { ok: false, code: "expired" };
  }

  return { ok: true, claims };
}

/** In-memory revocation set (single-node). Multi-instance: replace with shared store. */
const revoked = new Set<string>();

export function revokeRealtimeTicket(jti: string): void {
  revoked.add(jti);
}

export function isRealtimeTicketRevoked(jti: string): boolean {
  return revoked.has(jti);
}

export function clearRealtimeTicketRevocations(): void {
  revoked.clear();
}
