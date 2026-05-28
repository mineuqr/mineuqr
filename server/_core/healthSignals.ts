import { opsLog } from "./opsLog";
import { OPS_EVENT } from "./opsTaxonomy";

type Counter = {
  count: number;
  windowStart: number;
  lastSeenAt: number;
  lastEmittedAt?: number;
};

const OPS_HEALTH_DEBUG = process.env.OPS_HEALTH_DEBUG === "1";

const WINDOW_MS = 60 * 1000; // 1 minute buckets
const CLEANUP_INTERVAL_MS = 60 * 1000;
const MAX_KEYS = 5000;

const DEFAULT_EMIT_COOLDOWN_MS = 2 * 60 * 1000;
const DEBUG_EMIT_COOLDOWN_MS = 30 * 1000;

let lastCleanup = Date.now();
const counters = new Map<string, Counter>();

function cleanup(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, c] of Array.from(counters.entries())) {
    if (now - c.lastSeenAt > WINDOW_MS * 5) counters.delete(key);
  }

  if (counters.size <= MAX_KEYS) return;
  const entries = Array.from(counters.entries()).sort(
    (a, b) => a[1].lastSeenAt - b[1].lastSeenAt
  );
  const toRemove = counters.size - MAX_KEYS;
  for (let i = 0; i < toRemove; i++) counters.delete(entries[i]![0]);
}

function cooldownMs(): number {
  return OPS_HEALTH_DEBUG ? DEBUG_EMIT_COOLDOWN_MS : DEFAULT_EMIT_COOLDOWN_MS;
}

function thresholdForProcedure(procedure: string, type: string): number {
  if (OPS_HEALTH_DEBUG) return 20;

  // Baseline thresholds tuned for “polling heavy” detection without spam.
  // Most dashboards poll every ~10s per procedure → ~6/min.
  if (type === "query") return 120; // ~2 req/s sustained
  if (type === "mutation") return 60;

  // Unknown type
  return 120;
}

function procedureKey(procedure: string, type: string): string {
  return `trpc:${type}:${procedure}`;
}

/**
 * Aggregated (low-noise) detection of polling/retry pressure by procedure.
 * Emits only when a threshold is crossed, and is cooldowned.
 */
export function trackTrpcProcedurePressure(input: {
  procedure: string;
  procedureType: string;
  correlationId?: string;
}): void {
  const now = Date.now();
  cleanup(now);

  const key = procedureKey(input.procedure, input.procedureType);
  const threshold = thresholdForProcedure(input.procedure, input.procedureType);

  let c = counters.get(key);
  if (!c || now - c.windowStart >= WINDOW_MS) {
    c = { count: 0, windowStart: now, lastSeenAt: now };
    counters.set(key, c);
  }

  c.count += 1;
  c.lastSeenAt = now;

  if (c.count < threshold) return;

  const lastEmitted = c.lastEmittedAt ?? 0;
  if (now - lastEmitted < cooldownMs()) return;
  c.lastEmittedAt = now;

  opsLog({
    type: OPS_EVENT.degraded_polling_pressure,
    category: "RUNTIME",
    severity: "warn",
    ts: new Date(now).toISOString(),
    correlationId: input.correlationId,
    procedure: input.procedure,
    metadata: {
      procedure: input.procedure,
      procedureType: input.procedureType,
      countInWindow: c.count,
      windowMs: WINDOW_MS,
      threshold,
    },
  });
}

/**
 * Scheduled task lifecycle visibility (low-noise). Always emits start/complete at debug level
 * only when OPS_HEALTH_DEBUG=1; otherwise emits warnings only for degraded runs.
 */
export function trackScheduledTaskRun(input: {
  taskName: string;
  phase: "started" | "completed" | "warning";
  ts?: string;
  durationMs?: number;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}): void {
  const ts = input.ts ?? new Date().toISOString();

  if (input.phase === "started") {
    if (!OPS_HEALTH_DEBUG) return;
    opsLog({
      type: OPS_EVENT.scheduled_task_started,
      category: "SYSTEM",
      severity: "debug",
      ts,
      correlationId: input.correlationId,
      action: input.taskName,
      metadata: { taskName: input.taskName, ...input.metadata },
    });
    return;
  }

  if (input.phase === "completed") {
    if (!OPS_HEALTH_DEBUG) return;
    opsLog({
      type: OPS_EVENT.scheduled_task_completed,
      category: "SYSTEM",
      severity: "debug",
      ts,
      correlationId: input.correlationId,
      action: input.taskName,
      metadata: {
        taskName: input.taskName,
        durationMs: input.durationMs,
        ...input.metadata,
      },
    });
    return;
  }

  opsLog({
    type: OPS_EVENT.scheduled_task_runtime_warning,
    category: "SYSTEM",
    severity: "warn",
    ts,
    correlationId: input.correlationId,
    action: input.taskName,
    metadata: {
      taskName: input.taskName,
      durationMs: input.durationMs,
      ...input.metadata,
    },
  });
}

