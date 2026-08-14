/**
 * SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1
 * + PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1
 * Short-lived entitlement decision cache. Owner mode is part of cache identity.
 */

import type { CommercialEntitlementsResult } from "@commercial/getCommercialEntitlements";

type CacheEntry = {
  expiresAt: number;
  value: CommercialEntitlementsResult;
};

export type EntitlementCacheScope = {
  kind: "customer" | "platform_owner";
  mode?: string;
  simulatedPlanCode?: string | null;
};

const DEFAULT_TTL_MS = 5_000;
const cache = new Map<string, CacheEntry>();

export function entitlementCacheKey(
  ownerId: number,
  nowMs: number,
  scope: EntitlementCacheScope = { kind: "customer" }
): string {
  const second = Math.floor(nowMs / 1000);
  if (scope.kind === "platform_owner") {
    return `platform_owner:${ownerId}:${scope.mode ?? "unknown"}:${scope.simulatedPlanCode ?? "-"}:${second}`;
  }
  return `customer:${ownerId}:${second}`;
}

export function getCachedEntitlements(
  ownerId: number,
  now: Date = new Date(),
  scope: EntitlementCacheScope = { kind: "customer" }
): CommercialEntitlementsResult | null {
  const key = entitlementCacheKey(ownerId, now.getTime(), scope);
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
  ttlMs: number = DEFAULT_TTL_MS,
  scope: EntitlementCacheScope = { kind: "customer" }
): void {
  const key = entitlementCacheKey(ownerId, now.getTime(), scope);
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function invalidateEntitlementCache(ownerId?: number): void {
  if (ownerId == null) {
    cache.clear();
    return;
  }
  const needles = [`customer:${ownerId}:`, `platform_owner:${ownerId}:`];
  for (const key of Array.from(cache.keys())) {
    if (needles.some((n) => key.startsWith(n))) cache.delete(key);
  }
}
