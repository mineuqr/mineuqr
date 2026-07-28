/**
 * ORDER-LIFECYCLE-LATENCY-INSTRUMENTATION-1
 * Server-side ALS trace + opsLog emission. Observability only.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { opsLog } from "../../_core/opsLog";
import { OPS_EVENT } from "../../_core/opsTaxonomy";
import {
  ORDER_LIFECYCLE_LATENCY_PROGRAM,
  ORDER_LIFECYCLE_OBSERVER_POLL_MS,
  orderLifecycleIsoNow,
  orderLifecycleNowMs,
  recordOrderLifecycleLatencySample,
  type OrderLifecycleLatencyOperation,
  type OrderLifecycleLatencySummary,
} from "@shared/order-lifecycle-latency";

export type OrderLifecycleLatencyContext = {
  traceId: string;
  orderId?: number;
  restaurantId?: number | null;
  transition?: string;
  surface?: string;
  previousStatus?: string;
  t0: number;
  marks: Partial<Record<OrderLifecycleLatencyOperation, number>>;
  phaseDurations: Record<string, number>;
  meta: Record<string, unknown>;
  result: "ok" | "error";
  detail: boolean;
};

const als = new AsyncLocalStorage<OrderLifecycleLatencyContext>();

function detailEnabled(): boolean {
  return process.env.ORDER_LIFECYCLE_LATENCY_DETAIL === "1";
}

function instrumentationEnabled(): boolean {
  // Default ON in all environments; disable with ORDER_LIFECYCLE_LATENCY=0
  return process.env.ORDER_LIFECYCLE_LATENCY !== "0";
}

export function getOrderLifecycleLatencyContext():
  | OrderLifecycleLatencyContext
  | undefined {
  return als.getStore();
}

export function markOrderLifecycleLatency(
  operation: OrderLifecycleLatencyOperation,
  metadata?: Record<string, unknown>
): void {
  if (!instrumentationEnabled()) return;
  const store = als.getStore();
  if (!store) return;

  const now = orderLifecycleNowMs();
  store.marks[operation] = now;

  if (store.detail || detailEnabled()) {
    opsLog({
      type: OPS_EVENT.order_lifecycle_latency_span,
      category: "ORDER",
      severity: "debug",
      ts: orderLifecycleIsoNow(),
      correlationId: store.traceId,
      restaurantId: store.restaurantId ?? undefined,
      metadata: {
        program: ORDER_LIFECYCLE_LATENCY_PROGRAM,
        operation,
        orderId: store.orderId,
        transition: store.transition,
        surface: store.surface,
        elapsedMs: Math.round(now - store.t0),
        ...metadata,
      },
    });
  }
}

export function noteOrderLifecyclePhase(
  phase: string,
  durationMs: number
): void {
  const store = als.getStore();
  if (!store) return;
  store.phaseDurations[phase] = Math.round(durationMs);
}

export function noteOrderLifecycleMeta(
  key: string,
  value: unknown
): void {
  const store = als.getStore();
  if (!store) return;
  store.meta[key] = value;
}

function buildSummary(store: OrderLifecycleLatencyContext): OrderLifecycleLatencySummary {
  const totalMs = Math.round(orderLifecycleNowMs() - store.t0);
  return {
    program: ORDER_LIFECYCLE_LATENCY_PROGRAM,
    traceId: store.traceId,
    orderId: store.orderId,
    restaurantId: store.restaurantId ?? null,
    transition: store.transition,
    surface: store.surface,
    result: store.result,
    totalMs,
    phases: { ...store.phaseDurations },
    realtimeEnabled: false,
    pollIntervalMs: ORDER_LIFECYCLE_OBSERVER_POLL_MS,
    timestamp: orderLifecycleIsoNow(),
    metadata: {
      previousStatus: store.previousStatus,
      ...store.meta,
      marks: Object.fromEntries(
        Object.entries(store.marks).map(([k, v]) => [
          k,
          typeof v === "number" ? Math.round(v - store.t0) : v,
        ])
      ),
    },
  };
}

export function finishOrderLifecycleLatency(
  result: "ok" | "error" = "ok"
): void {
  if (!instrumentationEnabled()) return;
  const store = als.getStore();
  if (!store) return;
  store.result = result;
  const summary = buildSummary(store);
  recordOrderLifecycleLatencySample(summary);
  opsLog({
    type: OPS_EVENT.order_lifecycle_latency_summary,
    category: "ORDER",
    severity: "info",
    ts: summary.timestamp,
    correlationId: summary.traceId,
    restaurantId: summary.restaurantId ?? undefined,
    action: "order_lifecycle_latency",
    metadata: {
      program: summary.program,
      orderId: summary.orderId,
      transition: summary.transition,
      surface: summary.surface,
      result: summary.result,
      totalMs: summary.totalMs,
      phases: summary.phases,
      realtimeEnabled: summary.realtimeEnabled,
      pollIntervalMs: summary.pollIntervalMs,
      previousStatus: store.previousStatus,
      ...summary.metadata,
    },
  });
}

export async function withOrderLifecycleLatency<T>(
  input: {
    traceId: string;
    orderId?: number;
    restaurantId?: number | null;
    transition?: string;
    surface?: string;
    previousStatus?: string;
  },
  fn: () => Promise<T>
): Promise<T> {
  if (!instrumentationEnabled()) {
    return fn();
  }

  const store: OrderLifecycleLatencyContext = {
    traceId: input.traceId,
    orderId: input.orderId,
    restaurantId: input.restaurantId,
    transition: input.transition,
    surface: input.surface,
    previousStatus: input.previousStatus,
    t0: orderLifecycleNowMs(),
    marks: {},
    phaseDurations: {},
    meta: {},
    result: "ok",
    detail: detailEnabled(),
  };

  return als.run(store, async () => {
    markOrderLifecycleLatency("api_entry");
    try {
      const value = await fn();
      markOrderLifecycleLatency("api_exit");
      finishOrderLifecycleLatency("ok");
      return value;
    } catch (error) {
      markOrderLifecycleLatency("mutation_error");
      finishOrderLifecycleLatency("error");
      throw error;
    }
  });
}
