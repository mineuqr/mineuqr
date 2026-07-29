/**
 * REALTIME-PLATFORM-OBSERVABILITY-1
 * Metrics catalog — SSOT for observable signals (visibility only).
 */

export const REALTIME_OBSERVABILITY_PROGRAM =
  "REALTIME-PLATFORM-OBSERVABILITY-1" as const;

export type RealtimeMetricDomain =
  | "gateway"
  | "connections"
  | "channels"
  | "hints"
  | "authorization"
  | "registry"
  | "fallback"
  | "latency"
  | "health";

export type RealtimeMetricDefinition = {
  id: string;
  domain: RealtimeMetricDomain;
  description: string;
  unit: "count" | "gauge" | "ms" | "micros" | "ratio";
};

export const REALTIME_METRICS_CATALOG: readonly RealtimeMetricDefinition[] = [
  { id: "connections.active", domain: "connections", description: "Current SSE connections", unit: "gauge" },
  { id: "connections.peak", domain: "connections", description: "Peak concurrent connections", unit: "gauge" },
  { id: "connections.opened", domain: "connections", description: "Connections opened", unit: "count" },
  { id: "connections.closed", domain: "connections", description: "Connections closed", unit: "count" },
  { id: "connections.rejected", domain: "connections", description: "Rejected connection attempts", unit: "count" },
  { id: "connections.failed", domain: "connections", description: "Connection failures", unit: "count" },
  { id: "reconnects.attempts", domain: "connections", description: "Reconnect attempts (client-reported / gaps)", unit: "count" },
  { id: "subscriptions.active", domain: "channels", description: "Active channel subscriptions", unit: "gauge" },
  { id: "hints.published", domain: "hints", description: "Hints published", unit: "count" },
  { id: "hints.delivered", domain: "hints", description: "Hints delivered to connections", unit: "count" },
  { id: "hints.dropped", domain: "hints", description: "Hints dropped by ACL/filter", unit: "count" },
  { id: "auth.success", domain: "authorization", description: "Successful authorizations", unit: "count" },
  { id: "auth.denied", domain: "authorization", description: "Denied authorizations", unit: "count" },
  { id: "auth.channel_denied", domain: "authorization", description: "Unauthorized channel requests", unit: "count" },
  { id: "tickets.issued", domain: "authorization", description: "Tickets issued", unit: "count" },
  { id: "tickets.renewed", domain: "authorization", description: "Tickets renewed", unit: "count" },
  { id: "tickets.expired", domain: "authorization", description: "Tickets expired", unit: "count" },
  { id: "tickets.revoked", domain: "authorization", description: "Tickets revoked", unit: "count" },
  { id: "registry.lookups", domain: "registry", description: "Opaque registry lookups", unit: "count" },
  { id: "registry.lookup_latency_micros", domain: "registry", description: "Sum of lookup latencies", unit: "micros" },
  { id: "registry.size", domain: "registry", description: "Registry entry count", unit: "gauge" },
  { id: "fallback.activations", domain: "fallback", description: "Poll fallback activations", unit: "count" },
  { id: "latency.publish_to_deliver_ms", domain: "latency", description: "Publish→deliver latency samples", unit: "ms" },
  { id: "latency.auth_ms", domain: "latency", description: "Authorization duration samples", unit: "ms" },
  { id: "heartbeats", domain: "gateway", description: "Heartbeat frames sent", unit: "count" },
] as const;
