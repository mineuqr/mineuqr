/**
 * REALTIME-PLATFORM-FOUNDATION-1
 * Client-side sequence / gap helpers (framework-agnostic).
 */

export type SeqDecision =
  | { action: "apply"; reason: "first" | "next" | "equal_refresh" }
  | { action: "duplicate"; reason: "stale_or_dup" }
  | { action: "gap"; reason: "sequence_gap"; expected: number; got: number };

/**
 * Per-aggregate (or per-key) monotonic seq tracker.
 */
export class RealtimeSequenceTracker {
  private readonly last = new Map<string, number>();

  key(restaurantId: number, channel: string, aggregateId?: string): string {
    return `${restaurantId}:${channel}:${aggregateId ?? "_"}`;
  }

  observe(
    restaurantId: number,
    channel: string,
    seq: number,
    aggregateId?: string
  ): SeqDecision {
    const k = this.key(restaurantId, channel, aggregateId);
    const prev = this.last.get(k);
    if (prev == null) {
      this.last.set(k, seq);
      return { action: "apply", reason: "first" };
    }
    if (seq < prev) {
      return { action: "duplicate", reason: "stale_or_dup" };
    }
    if (seq === prev) {
      return { action: "apply", reason: "equal_refresh" };
    }
    if (seq > prev + 1) {
      this.last.set(k, seq);
      return { action: "gap", reason: "sequence_gap", expected: prev + 1, got: seq };
    }
    this.last.set(k, seq);
    return { action: "apply", reason: "next" };
  }

  clear(): void {
    this.last.clear();
  }

  size(): number {
    return this.last.size;
  }
}
