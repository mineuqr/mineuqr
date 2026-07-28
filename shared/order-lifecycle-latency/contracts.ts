/**
 * ORDER-LIFECYCLE-LATENCY-INSTRUMENTATION-1
 * Shared contracts — presentation/observability only. No domain logic.
 */

export const ORDER_LIFECYCLE_LATENCY_PROGRAM =
  "ORDER-LIFECYCLE-LATENCY-INSTRUMENTATION-1" as const;

export type OrderLifecycleLatencyLayer =
  | "client"
  | "network"
  | "api"
  | "domain"
  | "database"
  | "events"
  | "projection"
  | "realtime"
  | "rendering"
  | "refresh";

export type OrderLifecycleLatencyOperation =
  | "click"
  | "mutation_start"
  | "mutation_success"
  | "mutation_error"
  | "invalidate_start"
  | "invalidate_end"
  | "refetch_start"
  | "refetch_end"
  | "visible_update"
  | "render_commit"
  | "api_entry"
  | "authz"
  | "command_start"
  | "command_complete"
  | "relay_start"
  | "relay_end"
  | "integration_dispatch"
  | "projection_dispatch"
  | "api_exit"
  | "observer_poll_refresh"
  | "summary";

export type OrderLifecycleLatencySpan = {
  program: typeof ORDER_LIFECYCLE_LATENCY_PROGRAM;
  traceId: string;
  layer: OrderLifecycleLatencyLayer;
  operation: OrderLifecycleLatencyOperation;
  transition?: string;
  orderId?: number;
  restaurantId?: number | null;
  surface?: string;
  timestamp: string;
  durationMs?: number;
  result?: "ok" | "error" | "skipped";
  metadata?: Record<string, unknown>;
};

export type OrderLifecycleLatencySummary = {
  program: typeof ORDER_LIFECYCLE_LATENCY_PROGRAM;
  traceId: string;
  orderId?: number;
  restaurantId?: number | null;
  transition?: string;
  surface?: string;
  result: "ok" | "error";
  totalMs: number;
  phases: Record<string, number>;
  realtimeEnabled: false;
  pollIntervalMs: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export function createOrderLifecycleTraceId(): string {
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  if (cryptoObj?.randomUUID) {
    return `olt_${cryptoObj.randomUUID()}`;
  }
  return `olt_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`;
}

export function orderLifecycleNowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

export function orderLifecycleIsoNow(): string {
  return new Date().toISOString();
}

/** Default operational poll ceiling (Mode A fallback after remediation). */
export const ORDER_LIFECYCLE_OBSERVER_POLL_MS = 3_000;
