/**
 * ORDER-INTERACTION-PERFORMANCE-1 — development-only interaction diagnostics.
 *
 * Counts presentation mapping, presentation reuse, card renders, and workspace
 * updates so regressions in interaction locality become observable during
 * development. Production cost is a single boolean check per event; the whole
 * module (and its call sites) can be removed without affecting architecture.
 */
export type OrderPerfEvent =
  | "presentation:mapped"
  | "presentation:reused"
  | "card:rendered"
  | "workspace:updated";

export type OrderPerfCounters = Readonly<Record<OrderPerfEvent, number>>;

function createCounters(): Record<OrderPerfEvent, number> {
  return {
    "presentation:mapped": 0,
    "presentation:reused": 0,
    "card:rendered": 0,
    "workspace:updated": 0,
  };
}

function detectDefaultEnabled(): boolean {
  try {
    return Boolean(
      (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV
    );
  } catch {
    return false;
  }
}

let enabled = detectDefaultEnabled();
let counters = createCounters();

/** Enables/disables instrumentation. Defaults to the dev environment flag. */
export function setOrderPerfInstrumentationEnabled(value: boolean): void {
  enabled = value;
}

export function isOrderPerfInstrumentationEnabled(): boolean {
  return enabled;
}

/** Records an interaction event. No-ops (single boolean check) in production. */
export function recordOrderPerfEvent(event: OrderPerfEvent, count = 1): void {
  if (!enabled) return;
  counters[event] += count;
}

/** Immutable snapshot of the current counters. */
export function readOrderPerfCounters(): OrderPerfCounters {
  return { ...counters };
}

export function resetOrderPerfCounters(): void {
  counters = createCounters();
}
