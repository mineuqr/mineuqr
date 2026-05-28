/**
 * In-memory sliding-window counter with emit cooldown (AUTH2-D.1).
 * Shared by auth-local invalid-token bursts and OAuth invalid-callback bursts.
 */

export type CooldownCounterEntry = {
  count: number;
  windowStart: number;
  lastSeenAt: number;
  lastEmittedAt?: number;
};

export type CooldownCounterMapOptions = {
  windowMs: number;
  emitCooldownMs: number;
  maxKeys: number;
  /** Keys idle longer than windowMs * staleMultiplier are removed. Default 2. */
  staleMultiplier?: number;
};

export type CooldownCounterMap = {
  increment(key: string, now: number): CooldownCounterEntry;
  canEmit(entry: CooldownCounterEntry, now: number): boolean;
  markEmitted(entry: CooldownCounterEntry, now: number): void;
  cleanup(now: number): void;
};

export function createCooldownCounterMap(
  options: CooldownCounterMapOptions
): CooldownCounterMap {
  const staleMs = options.windowMs * (options.staleMultiplier ?? 2);
  const counters = new Map<string, CooldownCounterEntry>();

  function cleanup(now: number): void {
    for (const [k, c] of Array.from(counters.entries())) {
      if (now - c.lastSeenAt > staleMs) counters.delete(k);
    }
    if (counters.size <= options.maxKeys) return;
    const entries = Array.from(counters.entries()).sort(
      (a, b) => a[1].lastSeenAt - b[1].lastSeenAt
    );
    const toRemove = counters.size - options.maxKeys;
    for (let i = 0; i < toRemove; i++) counters.delete(entries[i]![0]);
  }

  function increment(key: string, now: number): CooldownCounterEntry {
    cleanup(now);

    let entry = counters.get(key);
    if (!entry || now - entry.windowStart >= options.windowMs) {
      entry = { count: 0, windowStart: now, lastSeenAt: now };
      counters.set(key, entry);
    }
    entry.count += 1;
    entry.lastSeenAt = now;
    return entry;
  }

  function canEmit(entry: CooldownCounterEntry, now: number): boolean {
    const lastEmitted = entry.lastEmittedAt ?? 0;
    return now - lastEmitted >= options.emitCooldownMs;
  }

  function markEmitted(entry: CooldownCounterEntry, now: number): void {
    entry.lastEmittedAt = now;
  }

  return { increment, canEmit, markEmitted, cleanup };
}
