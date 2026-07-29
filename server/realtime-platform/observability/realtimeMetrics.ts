/**
 * REALTIME-PLATFORM-FOUNDATION-1 / REALTIME-PUBLIC-TICKET-HARDENING-1
 * / REALTIME-PLATFORM-OBSERVABILITY-1
 * Platform observability counters + opsLog hooks + rich store feed.
 */

import { opsLog } from "../../_core/opsLog";
import { OPS_EVENT } from "../../_core/opsTaxonomy";
import {
  observeAuthDenied,
  observeChannelAuthFailure,
  observeConnectionClosed,
  observeConnectionOpened,
  observeConnectionRejected,
  observeHintDelivered,
  observeHintDropped,
  observeHintPublished,
  observeReconnect,
  observeRegistryCleanup,
  resetRealtimeObservabilityStore,
} from "./realtimeObservabilityStore";
import { sanitizeRealtimeLogMetadata } from "./realtimeStructuredLog";

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
  resetRealtimeObservabilityStore();
}

export function incRealtimeMetric(
  key: keyof RealtimeMetricsSnapshot,
  by = 1
): void {
  metrics[key] += by;
  // Feed derived store for selected counters (visibility only).
  try {
    if (key === "dropped" && by > 0) observeHintDropped();
    if (key === "reconnects" && by > 0) observeReconnect();
    if (key === "channelAuthFailures" && by > 0) observeChannelAuthFailure();
  } catch {
    /* never throw */
  }
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

function feedStoreFromEvent(
  type: RealtimeOpsEventType,
  metadata: Record<string, unknown>
): void {
  try {
    switch (type) {
      case "realtime_connection_opened":
        observeConnectionOpened({
          connectionId: String(metadata.connectionId ?? ""),
          restaurantId: Number(metadata.restaurantId ?? 0),
          channels: Array.isArray(metadata.channels)
            ? (metadata.channels as string[])
            : [],
          activeConnections: metrics.connections,
        });
        break;
      case "realtime_connection_closed":
        observeConnectionClosed({
          connectionId: String(metadata.connectionId ?? ""),
          restaurantId: Number(metadata.restaurantId ?? 0),
          channels: Array.isArray(metadata.channels)
            ? (metadata.channels as string[])
            : [],
          reason:
            (metadata.reason as
              | "client_close"
              | "error"
              | "shutdown"
              | "rejected"
              | "unknown"
              | undefined) ?? "client_close",
        });
        break;
      case "realtime_hint_published":
        observeHintPublished({
          channel: String(metadata.channel ?? ""),
          correlationId:
            typeof metadata.correlationId === "string"
              ? metadata.correlationId
              : undefined,
          ts: typeof metadata.ts === "string" ? metadata.ts : undefined,
        });
        break;
      case "realtime_hint_delivered":
        observeHintDelivered({
          channel: String(metadata.channel ?? ""),
          correlationId:
            typeof metadata.correlationId === "string"
              ? metadata.correlationId
              : undefined,
        });
        break;
      case "realtime_auth_failed":
        observeAuthDenied(String(metadata.code ?? ""));
        observeConnectionRejected(String(metadata.code ?? ""));
        break;
      case "realtime_gap_detected":
      case "realtime_fallback_activated":
        observeReconnect(
          typeof metadata.channel === "string" ? metadata.channel : undefined
        );
        break;
      case "realtime_ticket_cleanup":
        observeRegistryCleanup(
          Number(metadata.removed ?? 0),
          Number(metadata.durationMs ?? 0)
        );
        break;
      default:
        break;
    }
  } catch {
    /* never throw */
  }
}

export function noteRealtimeEvent(
  type: RealtimeOpsEventType,
  metadata: Record<string, unknown>
): void {
  try {
    feedStoreFromEvent(type, metadata);
    const known = type in OPS_EVENT ? OPS_EVENT[type as keyof typeof OPS_EVENT] : type;
    opsLog({
      type: known as (typeof OPS_EVENT)[keyof typeof OPS_EVENT],
      category: "RUNTIME",
      severity: type.includes("failed") ? "warn" : "info",
      ts: new Date().toISOString(),
      metadata: {
        program: "REALTIME-PLATFORM-OBSERVABILITY-1",
        ...sanitizeRealtimeLogMetadata(metadata),
        metrics: getRealtimeMetrics(),
      },
    });
  } catch {
    /* observability must never throw */
  }
}
