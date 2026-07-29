/**
 * REALTIME-PUBLIC-TICKET-HARDENING-1
 * Opaque customer realtime tickets — registry is the sole ACL source.
 * Client receives only `rt_live_…` (no JWT / no embedded claims).
 */

import { randomBytes } from "node:crypto";
import {
  DEFAULT_SERVER_CAPABILITIES,
  negotiateRealtimeCapabilities,
  type RealtimeAuthMode,
  type RealtimeChannel,
  type RealtimeClientCapabilities,
  type RealtimeServerCapabilities,
  type RealtimeTicketClaims,
} from "@shared/realtime-platform";
import { filterChannelsForAuthMode } from "./RealtimeTicketService";
import {
  incRealtimeMetric,
  noteRealtimeEvent,
} from "../observability/realtimeMetrics";

export const OPAQUE_TICKET_PREFIX = "rt_live_" as const;

export type OpaqueTicketStatus = "active" | "revoked" | "expired";

export type RealtimeOpaqueTicketRecord = {
  ticketId: string;
  /** Tenant scope (currently restaurant). Server-only. */
  tenantId: number;
  restaurantId: number;
  orderId: number;
  trackingTokenHash: string;
  allowedChannels: readonly RealtimeChannel[];
  authMode: RealtimeAuthMode;
  sub: string;
  protocolVersion: number;
  capabilities: RealtimeTicketClaims["capabilities"];
  issuedAt: number;
  expiresAt: number;
  lastAccessAt: number;
  status: OpaqueTicketStatus;
  revocationReason?: string;
  /** Optional connection binding after first SSE open. */
  boundConnectionId?: string;
};

export type IssueOpaqueCustomerTicketInput = {
  restaurantId: number;
  orderId: number;
  trackingTokenHash: string;
  clientCapabilities?: Partial<RealtimeClientCapabilities>;
  ttlSeconds?: number;
};

export type OpaqueCustomerTicketMintResult = {
  token: string;
  expiresAt: string;
  ssePath: string;
  channels: RealtimeChannel[];
  protocolVersion: number;
  negotiated: RealtimeServerCapabilities;
};

const registry = new Map<string, RealtimeOpaqueTicketRecord>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function isOpaqueRealtimeTicket(token: string): boolean {
  return typeof token === "string" && token.startsWith(OPAQUE_TICKET_PREFIX);
}

/** Opaque customer tickets on by default; set REALTIME_OPAQUE_CUSTOMER_TICKETS=false to roll back. */
export function isOpaqueCustomerTicketsEnabled(): boolean {
  return process.env.REALTIME_OPAQUE_CUSTOMER_TICKETS !== "false";
}

/**
 * Legacy customer JWTs accepted during migration.
 * Set REALTIME_LEGACY_CUSTOMER_JWT=false after cutover.
 */
export function isLegacyCustomerJwtEnabled(): boolean {
  return process.env.REALTIME_LEGACY_CUSTOMER_JWT !== "false";
}

function generateOpaqueTicketId(): string {
  // 256-bit entropy, unguessable, non-decodable.
  return `${OPAQUE_TICKET_PREFIX}${randomBytes(32).toString("base64url")}`;
}

function recordToClaims(record: RealtimeOpaqueTicketRecord): RealtimeTicketClaims {
  return {
    jti: record.ticketId,
    restaurantId: record.restaurantId,
    authMode: record.authMode,
    channels: [...record.allowedChannels],
    protocolVersion: record.protocolVersion,
    sub: record.sub,
    orderId: record.orderId,
    trackingRef: record.trackingTokenHash,
    iat: record.issuedAt,
    exp: record.expiresAt,
    capabilities: record.capabilities,
  };
}

export function issueOpaqueCustomerTicket(
  input: IssueOpaqueCustomerTicketInput
): OpaqueCustomerTicketMintResult {
  const negotiation = negotiateRealtimeCapabilities(input.clientCapabilities);
  if (!negotiation.ok) {
    throw new Error(negotiation.message);
  }

  const channels = filterChannelsForAuthMode(["customer"], "customer_tracking");
  if (channels.length === 0) {
    throw new Error("No authorized realtime channels");
  }

  const now = Math.floor(Date.now() / 1000);
  const ttl =
    input.ttlSeconds ??
    negotiation.negotiated.ticketTtlSeconds ??
    DEFAULT_SERVER_CAPABILITIES.ticketTtlSeconds;

  const ticketId = generateOpaqueTicketId();
  const record: RealtimeOpaqueTicketRecord = {
    ticketId,
    tenantId: input.restaurantId,
    restaurantId: input.restaurantId,
    orderId: input.orderId,
    trackingTokenHash: input.trackingTokenHash,
    allowedChannels: channels,
    authMode: "customer_tracking",
    sub: `th:${input.trackingTokenHash}`,
    protocolVersion: negotiation.negotiated.protocolVersion,
    capabilities: {
      heartbeat: negotiation.negotiated.heartbeat,
      reconnect: negotiation.negotiated.reconnect,
      pollFallback: negotiation.negotiated.pollFallback,
      broadcastBridge: negotiation.negotiated.broadcastBridge,
      lastEventIdResume: negotiation.negotiated.lastEventIdResume,
    },
    issuedAt: now,
    expiresAt: now + ttl,
    lastAccessAt: now,
    status: "active",
  };

  registry.set(ticketId, record);
  ensureCleanupTimer();
  incRealtimeMetric("ticketsIssued");
  noteRealtimeEvent("realtime_ticket_issued", {
    kind: "opaque_customer",
    ticketPrefix: OPAQUE_TICKET_PREFIX,
    channels,
    ticketIdSuffix: ticketId.slice(-8),
  });

  return {
    token: ticketId,
    expiresAt: new Date(record.expiresAt * 1000).toISOString(),
    ssePath: "/api/realtime/sse",
    channels: [...channels],
    protocolVersion: record.protocolVersion,
    negotiated: negotiation.negotiated,
  };
}

export type LookupOpaqueTicketResult =
  | { ok: true; claims: RealtimeTicketClaims; record: RealtimeOpaqueTicketRecord }
  | {
      ok: false;
      code: "malformed" | "not_found" | "expired" | "revoked";
    };

/**
 * Fast registry lookup — sole authorization source for opaque tickets.
 * Marks expired tickets and updates lastAccess on success.
 */
export function lookupOpaqueRealtimeTicket(
  token: string
): LookupOpaqueTicketResult {
  const started = performance.now();
  try {
    if (!isOpaqueRealtimeTicket(token)) {
      return { ok: false, code: "malformed" };
    }

    incRealtimeMetric("registryLookups");
    const record = registry.get(token);
    if (!record) {
      return { ok: false, code: "not_found" };
    }

    const now = Math.floor(Date.now() / 1000);
    if (record.status === "revoked") {
      return { ok: false, code: "revoked" };
    }
    if (record.status === "expired" || record.expiresAt < now) {
      if (record.status !== "expired") {
        record.status = "expired";
        incRealtimeMetric("ticketsExpired");
      }
      return { ok: false, code: "expired" };
    }

    record.lastAccessAt = now;
    return { ok: true, claims: recordToClaims(record), record };
  } finally {
    const elapsed = performance.now() - started;
    incRealtimeMetric(
      "registryLookupLatencyMicros",
      Math.max(1, Math.round(elapsed * 1000))
    );
  }
}

export function revokeOpaqueRealtimeTicket(
  ticketId: string,
  reason = "revoked"
): boolean {
  const record = registry.get(ticketId);
  if (!record) return false;
  if (record.status === "revoked") return true;
  record.status = "revoked";
  record.revocationReason = reason;
  record.lastAccessAt = Math.floor(Date.now() / 1000);
  incRealtimeMetric("ticketsRevoked");
  noteRealtimeEvent("realtime_ticket_revoked", {
    kind: "opaque_customer",
    ticketIdSuffix: ticketId.slice(-8),
    reason,
  });
  return true;
}

/**
 * Renew: revoke current opaque ticket and issue a replacement (rotation).
 * Requires a still-valid ticket.
 */
export function renewOpaqueCustomerTicket(
  ticketId: string,
  clientCapabilities?: Partial<RealtimeClientCapabilities>
): OpaqueCustomerTicketMintResult | null {
  const looked = lookupOpaqueRealtimeTicket(ticketId);
  if (!looked.ok) return null;
  revokeOpaqueRealtimeTicket(ticketId, "renewed");
  const minted = issueOpaqueCustomerTicket({
    restaurantId: looked.record.restaurantId,
    orderId: looked.record.orderId,
    trackingTokenHash: looked.record.trackingTokenHash,
    clientCapabilities,
  });
  incRealtimeMetric("ticketsRenewed");
  return minted;
}

export function bindOpaqueTicketConnection(
  ticketId: string,
  connectionId: string
): void {
  const record = registry.get(ticketId);
  if (!record || record.status !== "active") return;
  if (!record.boundConnectionId) {
    record.boundConnectionId = connectionId;
  }
}

/**
 * Remove dead tickets past grace window. Marks active-but-past-expiry as expired first.
 * Revoked tickets use lastAccessAt as cleanup pivot; expired use expiresAt.
 */
export function cleanupOpaqueRealtimeTickets(graceSeconds = 60): number {
  const now = Math.floor(Date.now() / 1000);
  let removed = 0;
  for (const [id, record] of registry) {
    if (record.status === "active" && record.expiresAt < now) {
      record.status = "expired";
      incRealtimeMetric("ticketsExpired");
    }
    if (record.status === "active") continue;
    const pivot =
      record.status === "revoked" ? record.lastAccessAt : record.expiresAt;
    if (pivot + graceSeconds > now) continue;
    registry.delete(id);
    removed += 1;
  }
  if (removed > 0) {
    noteRealtimeEvent("realtime_ticket_cleanup", {
      removed,
      size: registry.size,
    });
  }
  return removed;
}

function ensureCleanupTimer(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    try {
      cleanupOpaqueRealtimeTickets();
    } catch {
      /* never throw from timer */
    }
  }, 60_000);
  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export function getOpaqueTicketRegistrySize(): number {
  return registry.size;
}

/** Test helper — clears registry + stops cleanup timer. */
export function clearOpaqueRealtimeTicketRegistry(): void {
  registry.clear();
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
