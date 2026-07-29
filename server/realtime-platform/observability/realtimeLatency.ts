/**
 * REALTIME-PLATFORM-OBSERVABILITY-1
 * Latency percentile helpers — ring-buffer samples, no business payloads.
 */

const MAX_SAMPLES = 512;

export type LatencyPercentiles = {
  count: number;
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  worst: number;
};

export class LatencyRingBuffer {
  private readonly samples: number[] = [];
  private readonly max: number;

  constructor(max = MAX_SAMPLES) {
    this.max = max;
  }

  record(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) return;
    this.samples.push(ms);
    if (this.samples.length > this.max) {
      this.samples.splice(0, this.samples.length - this.max);
    }
  }

  clear(): void {
    this.samples.length = 0;
  }

  get size(): number {
    return this.samples.length;
  }

  percentiles(): LatencyPercentiles {
    if (this.samples.length === 0) {
      return { count: 0, p50: 0, p95: 0, p99: 0, avg: 0, worst: 0 };
    }
    const sorted = [...this.samples].sort((a, b) => a - b);
    const pick = (p: number) => {
      const idx = Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
      );
      return sorted[idx]!;
    };
    const sum = sorted.reduce((a, b) => a + b, 0);
    return {
      count: sorted.length,
      p50: pick(50),
      p95: pick(95),
      p99: pick(99),
      avg: sum / sorted.length,
      worst: sorted[sorted.length - 1]!,
    };
  }
}
