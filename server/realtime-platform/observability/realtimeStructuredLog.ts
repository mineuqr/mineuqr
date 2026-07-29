/**
 * REALTIME-PLATFORM-OBSERVABILITY-1
 * Structured logging — sanitize metadata; never log business payloads.
 */

const FORBIDDEN_KEYS = new Set([
  "password",
  "token",
  "ticket",
  "authorization",
  "cookie",
  "trackingToken",
  "lineItems",
  "totalAmount",
  "customerName",
  "customerPhone",
  "payload",
  "orderDto",
  "sessionDto",
  "checkDto",
]);

export function sanitizeRealtimeLogMetadata(
  metadata: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    if (key.toLowerCase().includes("token")) continue;
    if (key.toLowerCase().includes("secret")) continue;
    // Keep operational ids only as opaque suffixes when long.
    if (
      (key === "ticketId" || key === "jti") &&
      typeof value === "string" &&
      value.length > 12
    ) {
      out[key] = `…${value.slice(-8)}`;
      continue;
    }
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      out[key] = sanitizeRealtimeLogMetadata(value as Record<string, unknown>);
      continue;
    }
    out[key] = value;
  }
  return out;
}

export type RealtimeStructuredLogEvent = {
  timestamp: string;
  correlationId?: string;
  connectionId?: string;
  /** Tenant id for ops isolation — numeric only, never restaurant name. */
  tenantId?: number;
  channel?: string;
  operation: string;
  durationMs?: number;
  result: "ok" | "denied" | "error" | "dropped";
  metadata?: Record<string, unknown>;
};

export function buildRealtimeStructuredLog(
  event: RealtimeStructuredLogEvent
): Record<string, unknown> {
  return {
    timestamp: event.timestamp,
    program: "REALTIME-PLATFORM-OBSERVABILITY-1",
    correlationId: event.correlationId,
    connectionId: event.connectionId,
    tenantId: event.tenantId,
    channel: event.channel,
    operation: event.operation,
    durationMs: event.durationMs,
    result: event.result,
    ...(event.metadata
      ? { metadata: sanitizeRealtimeLogMetadata(event.metadata) }
      : {}),
  };
}
