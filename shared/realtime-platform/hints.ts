/**
 * REALTIME-PLATFORM-FOUNDATION-1
 * Hint envelope — invalidation signals only. No business DTOs.
 */

import { isRealtimeChannel, type RealtimeChannel } from "./channels";
import { REALTIME_PROTOCOL_VERSION } from "./protocol";

export const REALTIME_HINT_TYPES = [
  "order.created",
  "order.status_changed",
  "order.ready",
  "order.served",
  "order.cancelled",
  "session.opened",
  "session.closed",
  "check.paid",
  "check.voided",
  "kitchen.queue_changed",
  "notification.raised",
  "notification.cleared",
  "device.connected",
  "device.disconnected",
  "device.config_changed",
  "printer.online",
  "printer.offline",
  "print.job_changed",
  "dashboard.metric_changed",
  "customer.status_changed",
  "platform.heartbeat",
  "platform.catch_up",
] as const;

export type RealtimeHintType = (typeof REALTIME_HINT_TYPES)[number];

/**
 * Canonical hint envelope. Forbidden: line items, amounts, PII, full DTOs.
 */
export type RealtimeHint = {
  v: typeof REALTIME_PROTOCOL_VERSION;
  type: RealtimeHintType;
  channel: RealtimeChannel;
  restaurantId: number;
  /** Opaque aggregate id when applicable (orderId, sessionId, …). */
  aggregateId?: string;
  /** Monotonic per-aggregate (or per-tenant) sequence for gap/dup detection. */
  seq: number;
  /** Optional projection / row version string. */
  version?: string;
  ts: string;
  correlationId?: string;
};

export type RealtimeHintInput = Omit<RealtimeHint, "v" | "ts"> & {
  ts?: string;
};

export function isRealtimeHintType(value: string): value is RealtimeHintType {
  return (REALTIME_HINT_TYPES as readonly string[]).includes(value);
}

export function createRealtimeHint(input: RealtimeHintInput): RealtimeHint {
  if (!isRealtimeChannel(input.channel)) {
    throw new Error(`Invalid realtime channel: ${input.channel}`);
  }
  if (!isRealtimeHintType(input.type)) {
    throw new Error(`Invalid realtime hint type: ${input.type}`);
  }
  if (!Number.isFinite(input.restaurantId) || input.restaurantId <= 0) {
    throw new Error("Invalid restaurantId");
  }
  if (!Number.isFinite(input.seq) || input.seq < 0) {
    throw new Error("Invalid seq");
  }

  return {
    v: REALTIME_PROTOCOL_VERSION,
    type: input.type,
    channel: input.channel,
    restaurantId: input.restaurantId,
    aggregateId: input.aggregateId,
    seq: input.seq,
    version: input.version,
    ts: input.ts ?? new Date().toISOString(),
    correlationId: input.correlationId,
  };
}

/** Ensure no accidental fat payloads slipped in. */
export function assertHintIsMetadataOnly(hint: RealtimeHint): void {
  const keys = Object.keys(hint).sort();
  const allowed = [
    "aggregateId",
    "channel",
    "correlationId",
    "restaurantId",
    "seq",
    "ts",
    "type",
    "v",
    "version",
  ];
  for (const key of keys) {
    if (!allowed.includes(key)) {
      throw new Error(`Realtime hint forbids field: ${key}`);
    }
  }
}
