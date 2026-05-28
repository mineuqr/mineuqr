/**
 * Simple per-key ops-log emit cooldown (AUTH2-D.1).
 * Used when only last-emission time matters (no rolling count window).
 */

export type EmitCooldownStamp = { lastEmittedAt?: number };

/**
 * If cooldown has elapsed, updates the stamp and returns true (caller should emit).
 * If still within cooldown, returns false without updating.
 */
export function tryConsumeEmitCooldown(input: {
  stamps: Map<string, EmitCooldownStamp>;
  key: string;
  now: number;
  cooldownMs: number;
}): boolean {
  const existing = input.stamps.get(input.key) ?? {};
  const last = existing.lastEmittedAt ?? 0;
  if (input.now - last < input.cooldownMs) return false;
  existing.lastEmittedAt = input.now;
  input.stamps.set(input.key, existing);
  return true;
}

/** Drop stamp keys whose last emission is older than maxAgeMs. */
export function cleanupEmitCooldownStamps(
  stamps: Map<string, EmitCooldownStamp>,
  now: number,
  maxAgeMs: number
): void {
  for (const [k, v] of Array.from(stamps.entries())) {
    const last = v.lastEmittedAt ?? 0;
    if (now - last > maxAgeMs) stamps.delete(k);
  }
}

/** Trim oldest stamps when map exceeds maxKeys (by lastEmittedAt). */
export function trimEmitCooldownStamps(
  stamps: Map<string, EmitCooldownStamp>,
  maxKeys: number
): void {
  if (stamps.size <= maxKeys) return;
  const entries = Array.from(stamps.entries()).sort(
    (a, b) => (a[1].lastEmittedAt ?? 0) - (b[1].lastEmittedAt ?? 0)
  );
  const toRemove = stamps.size - maxKeys;
  for (let i = 0; i < toRemove; i++) stamps.delete(entries[i]![0]);
}
