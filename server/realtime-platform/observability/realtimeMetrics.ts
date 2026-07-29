/**
 * REALTIME-PLATFORM-FOUNDATION-1 / REALTIME-PUBLIC-TICKET-HARDENING-1
 * Platform observability counters + opsLog hooks.
 */

import { opsLog } from "../../_core/opsLog";
import { OPS_EVENT } from "../../_core/opsTaxonomy";

export type RealtimeMetricsSnapshot = {
  connections: number;
  subscriptions: number;
  publishes: number;
  deliveries: number;
  dropped: number;
  reconnects: number;
  gaps: number;
  fallbackActivations: number;
  authFailures: number;
  heartbeats: number;
  /** Opaque ticket lifecycle (REALTIME-PUBLIC-TICKET-HARDENING-1). */
  ticketsIssued: number;
  ticketsRenewed: number;
  ticketsExpired: number;
  ticketsRevoked: number;
  registryLookups: number;
  /** Sum of lookup latencies in microseconds (divide by registryLookups for avg). */
  registryLookupLatencyMicros: number;
  channelAuthFailures: number;
};

const metrics: RealtimeMetricsSnapshot = {
  connections: 0,
  subscriptions: 0,
  publishes: 0,
  deliveries: 0,
  dropped: 0,
  reconnects: 0,
  gaps: 0,
  fallbackActivations: 0,
  authFailures: 0,
  heartbeats: 0,
  ticketsIssued: 0,
  ticketsRenewed: 0,
  ticketsExpired: 0,
  ticketsRevoked: 0,
  registryLookups: 0,
  registryLookupLatencyMicros: 0,
  channelAuthFailures: 0,
};

export function getRealtimeMetrics(): Readonly<RealtimeMetricsSnapshot> {
  return { ...metrics };
}

export function resetRealtimeMetrics(): void {
  for (const key of Object.keys(metrics) as (keyof RealtimeMetricsSnapshot)[]) {
    metrics[key] = 0;
  }
}

export function incRealtimeMetric(
  key: keyof RealtimeMetricsSnapshot,
  by = 1
): void {
  metrics[key] += by;
}

export type RealtimeOpsEventType =
  | "realtime_connection_opened"
  | "realtime_connection_closed"
  | "realtime_hint_published"
  | "realtime_hint_delivered"
  | "realtime_auth_failed"
  | "realtime_gap_detected"
  | "realtime_fallback_activated"
  | "realtime_ticket_issued"
  | "realtime_ticket_revoked"
  | "realtime_ticket_cleanup";

export function noteRealtimeEvent(
  type: RealtimeOpsEventType,
  metadata: Record<string, unknown>
): void {
  try {
    const known = type in OPS_EVENT ? OPS_EVENT[type as keyof typeof OPS_EVENT] : type;
    opsLog({
      type: known as (typeof OPS_EVENT)[keyof typeof OPS_EVENT],
      category: "RUNTIME",
      severity: type.includes("failed") ? "warn" : "info",
      ts: new Date().toISOString(),
      metadata: {
        program: "REALTIME-PLATFORM-FOUNDATION-1",
        ...metadata,
        metrics: getRealtimeMetrics(),
      },
    });
  } catch {
    /* observability must never throw */
  }
}
