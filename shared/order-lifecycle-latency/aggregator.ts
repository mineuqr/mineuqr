/**
 * ORDER-LIFECYCLE-LATENCY-INSTRUMENTATION-1
 * In-process rolling aggregator for future dashboards (no HTTP surface yet).
 */
import type { OrderLifecycleLatencySummary } from "./contracts";

const MAX_SAMPLES = 200;

export type OrderLifecycleLatencyAggregate = {
  count: number;
  okCount: number;
  errorCount: number;
  totalMs: { min: number; max: number; avg: number; p50: number; p90: number; p95: number; p99: number };
  phaseAvgs: Record<string, number>;
  byTransition: Record<string, number>;
  bySurface: Record<string, number>;
};

const samples: OrderLifecycleLatencySummary[] = [];

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)]!;
}

export function recordOrderLifecycleLatencySample(
  summary: OrderLifecycleLatencySummary
): void {
  samples.push(summary);
  if (samples.length > MAX_SAMPLES) {
    samples.splice(0, samples.length - MAX_SAMPLES);
  }
}

export function getOrderLifecycleLatencyAggregate(): OrderLifecycleLatencyAggregate {
  const totals = samples.map((s) => s.totalMs).sort((a, b) => a - b);
  const phaseSums: Record<string, { sum: number; n: number }> = {};
  const byTransition: Record<string, number> = {};
  const bySurface: Record<string, number> = {};
  let okCount = 0;
  let errorCount = 0;

  for (const s of samples) {
    if (s.result === "ok") okCount += 1;
    else errorCount += 1;
    if (s.transition) {
      byTransition[s.transition] = (byTransition[s.transition] ?? 0) + 1;
    }
    if (s.surface) {
      bySurface[s.surface] = (bySurface[s.surface] ?? 0) + 1;
    }
    for (const [k, v] of Object.entries(s.phases)) {
      const slot = phaseSums[k] ?? { sum: 0, n: 0 };
      slot.sum += v;
      slot.n += 1;
      phaseSums[k] = slot;
    }
  }

  const phaseAvgs: Record<string, number> = {};
  for (const [k, v] of Object.entries(phaseSums)) {
    phaseAvgs[k] = v.n > 0 ? Math.round((v.sum / v.n) * 100) / 100 : 0;
  }

  const avg =
    totals.length > 0
      ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 100) / 100
      : 0;

  return {
    count: samples.length,
    okCount,
    errorCount,
    totalMs: {
      min: totals[0] ?? 0,
      max: totals[totals.length - 1] ?? 0,
      avg,
      p50: percentile(totals, 50),
      p90: percentile(totals, 90),
      p95: percentile(totals, 95),
      p99: percentile(totals, 99),
    },
    phaseAvgs,
    byTransition,
    bySurface,
  };
}

export function resetOrderLifecycleLatencyAggregateForTests(): void {
  samples.length = 0;
}
