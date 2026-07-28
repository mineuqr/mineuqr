/**
 * ORDER-LIFECYCLE-LATENCY-INSTRUMENTATION-1
 * Client mutation / invalidate / observer timing. Observability only.
 */
import {
  ORDER_LIFECYCLE_LATENCY_PROGRAM,
  ORDER_LIFECYCLE_OBSERVER_POLL_MS,
  createOrderLifecycleTraceId,
  orderLifecycleIsoNow,
  orderLifecycleNowMs,
  recordOrderLifecycleLatencySample,
  type OrderLifecycleLatencyOperation,
  type OrderLifecycleLatencySummary,
} from "@shared/order-lifecycle-latency";

type ClientTrace = {
  traceId: string;
  orderId?: number;
  restaurantId?: number;
  transition?: string;
  surface?: string;
  t0: number;
  marks: Partial<Record<OrderLifecycleLatencyOperation, number>>;
  phases: Record<string, number>;
  result: "ok" | "error";
  ended: boolean;
};

let activeTrace: ClientTrace | null = null;
let lastMutationCompletedAt = 0;
let lastMutationRestaurantId: number | null = null;

function enabled(): boolean {
  try {
    if (import.meta.env.VITE_ORDER_LIFECYCLE_LATENCY === "0") return false;
  } catch {
    /* non-vite */
  }
  return true;
}

function detailEnabled(): boolean {
  try {
    return import.meta.env.VITE_ORDER_LIFECYCLE_LATENCY_DETAIL === "1";
  } catch {
    return false;
  }
}

function emitConsole(kind: string, payload: Record<string, unknown>): void {
  // Structured, low-noise: one line JSON for log pipelines.
  console.info(
    `[mineuqr:olt] ${kind}`,
    JSON.stringify({ program: ORDER_LIFECYCLE_LATENCY_PROGRAM, ...payload })
  );
}

export function beginOrderLifecycleClientTrace(input: {
  orderId?: number;
  restaurantId?: number;
  transition?: string;
  surface?: string;
  traceId?: string;
}): ClientTrace {
  const trace: ClientTrace = {
    traceId: input.traceId ?? createOrderLifecycleTraceId(),
    orderId: input.orderId,
    restaurantId: input.restaurantId,
    transition: input.transition,
    surface: input.surface,
    t0: orderLifecycleNowMs(),
    marks: {},
    phases: {},
    result: "ok",
    ended: false,
  };
  activeTrace = trace;
  if (enabled()) {
    markOrderLifecycleClient(trace, "click");
  }
  return trace;
}

export function getActiveOrderLifecycleClientTrace(): ClientTrace | null {
  return activeTrace;
}

export function markOrderLifecycleClient(
  trace: ClientTrace | null | undefined,
  operation: OrderLifecycleLatencyOperation
): void {
  if (!enabled() || !trace || trace.ended) return;
  const now = orderLifecycleNowMs();
  const prev = trace.marks[operation];
  trace.marks[operation] = now;
  if (prev == null && operation !== "click") {
    // duration from previous mark or t0
  }
  if (detailEnabled()) {
    emitConsole("span", {
      traceId: trace.traceId,
      operation,
      orderId: trace.orderId,
      transition: trace.transition,
      surface: trace.surface,
      elapsedMs: Math.round(now - trace.t0),
    });
  }
}

export function noteOrderLifecycleClientPhase(
  trace: ClientTrace | null | undefined,
  phase: string,
  durationMs: number
): void {
  if (!trace || trace.ended) return;
  trace.phases[phase] = Math.round(durationMs);
}

export function endOrderLifecycleClientTrace(
  trace: ClientTrace | null | undefined,
  result: "ok" | "error" = "ok"
): void {
  if (!enabled() || !trace || trace.ended) return;
  trace.result = result;
  trace.ended = true;

  // Derive phase durations from marks where possible.
  const markMs = (op: OrderLifecycleLatencyOperation) =>
    typeof trace.marks[op] === "number"
      ? Math.round((trace.marks[op] as number) - trace.t0)
      : undefined;

  const mutationStart = trace.marks.mutation_start;
  const mutationDone =
    trace.marks.mutation_success ?? trace.marks.mutation_error;
  if (mutationStart != null && mutationDone != null) {
    trace.phases.network_and_server_ms = Math.round(mutationDone - mutationStart);
  }
  const invStart = trace.marks.invalidate_start;
  const invEnd = trace.marks.invalidate_end;
  if (invStart != null && invEnd != null) {
    trace.phases.invalidate_ms = Math.round(invEnd - invStart);
  }
  const refStart = trace.marks.refetch_start;
  const refEnd = trace.marks.refetch_end;
  if (refStart != null && refEnd != null) {
    trace.phases.refetch_ms = Math.round(refEnd - refStart);
  }

  const summary: OrderLifecycleLatencySummary = {
    program: ORDER_LIFECYCLE_LATENCY_PROGRAM,
    traceId: trace.traceId,
    orderId: trace.orderId,
    restaurantId: trace.restaurantId ?? null,
    transition: trace.transition,
    surface: trace.surface,
    result,
    totalMs: Math.round(orderLifecycleNowMs() - trace.t0),
    phases: { ...trace.phases },
    realtimeEnabled: false,
    pollIntervalMs: ORDER_LIFECYCLE_OBSERVER_POLL_MS,
    timestamp: orderLifecycleIsoNow(),
    metadata: {
      markOffsetsMs: {
        click: markMs("click"),
        mutation_start: markMs("mutation_start"),
        mutation_success: markMs("mutation_success"),
        mutation_error: markMs("mutation_error"),
        invalidate_start: markMs("invalidate_start"),
        invalidate_end: markMs("invalidate_end"),
        refetch_start: markMs("refetch_start"),
        refetch_end: markMs("refetch_end"),
        visible_update: markMs("visible_update"),
      },
    },
  };

  recordOrderLifecycleLatencySample(summary);
  emitConsole("summary", {
    traceId: summary.traceId,
    orderId: summary.orderId,
    transition: summary.transition,
    surface: summary.surface,
    result: summary.result,
    totalMs: summary.totalMs,
    phases: summary.phases,
    realtimeEnabled: false,
    pollIntervalMs: ORDER_LIFECYCLE_OBSERVER_POLL_MS,
  });

  if (result === "ok") {
    lastMutationCompletedAt = Date.now();
    lastMutationRestaurantId = trace.restaurantId ?? null;
  }

  if (activeTrace === trace) activeTrace = null;
}

/** Mode A — observer poll refresh delay after a recent mutation on this tab/process. */
export function noteOrderLifecycleObserverRefresh(input: {
  surface: string;
  restaurantId?: number;
}): void {
  if (!enabled() || !lastMutationCompletedAt) return;
  if (
    input.restaurantId != null &&
    lastMutationRestaurantId != null &&
    input.restaurantId !== lastMutationRestaurantId
  ) {
    return;
  }
  const delayMs = Date.now() - lastMutationCompletedAt;
  if (delayMs < 0 || delayMs > ORDER_LIFECYCLE_OBSERVER_POLL_MS * 2) {
    return;
  }
  emitConsole("observer", {
    type: "order_lifecycle_latency_observer",
    surface: input.surface,
    restaurantId: input.restaurantId ?? null,
    delayMs,
    pollIntervalMs: ORDER_LIFECYCLE_OBSERVER_POLL_MS,
    realtimeEnabled: false,
    timestamp: orderLifecycleIsoNow(),
  });
  // One sample per mutation.
  lastMutationCompletedAt = 0;
}

export { createOrderLifecycleTraceId };
