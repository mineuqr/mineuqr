/**
 * SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1
 * Short-lived entitlement decision cache (optional). Snapshot payload never mutated.
 */

import type { CommercialEntitlementsResult } from "@commercial/getCommercialEntitlements";

type CacheEntry = {
  expiresAt: number;
  value: CommercialEntitlementsResult;
};

const DEFAULT_TTL_MS = 5_000;
const cache = new Map<string, CacheEntry>();

export function entitlementCacheKey(ownerId: number, nowMs: number): string {
  // Bucket by second so clock skew within TTL still hits.
  return `${ownerId}:${Math.floor(nowMs / 1000)}`;
}

export function getCachedEntitlements(
  ownerId: number,
  now: Date = new Date()
): CommercialEntitlementsResult | null {
  const key = entitlementCacheKey(ownerId, now.getTime());
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

export function setCachedEntitlements(
  ownerId: number,
  value: CommercialEntitlementsResult,
  now: Date = new Date(),
  ttlMs: number = DEFAULT_TTL_MS
): void {
  const key = entitlementCacheKey(ownerId, now.getTime());
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function invalidateEntitlementCache(ownerId?: number): void {
  if (ownerId == null) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${ownerId}:`)) cache.delete(key);
  }
}
