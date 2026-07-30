/**
 * COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1
 * Optional public catalog read cache — NEVER SSOT. Invalidate on publish lifecycle.
 */

import type { PublicCatalogOffering } from "@shared/commercial-catalog";

type CacheEntry = {
  offerings: PublicCatalogOffering[];
  cachedAt: number;
};

let entry: CacheEntry | null = null;
let enabled = process.env.PUBLIC_CATALOG_CACHE === "1";
const ttlMs = Number(process.env.PUBLIC_CATALOG_CACHE_TTL_MS ?? 30_000);

export function isPublicCatalogCacheEnabled(): boolean {
  return enabled;
}

/** Test / ops toggle — default remains off (not SSOT). */
export function setPublicCatalogCacheEnabled(value: boolean): void {
  enabled = value;
  if (!value) entry = null;
}

export function getPublicCatalogCache(): PublicCatalogOffering[] | null {
  if (!enabled || !entry) return null;
  if (Date.now() - entry.cachedAt > ttlMs) {
    entry = null;
    return null;
  }
  return entry.offerings;
}

export function setPublicCatalogCache(offerings: PublicCatalogOffering[]): void {
  if (!enabled) return;
  entry = { offerings, cachedAt: Date.now() };
}

export function invalidatePublicCatalogCache(): void {
  entry = null;
}

export function publicCatalogCacheStats(): {
  enabled: boolean;
  warm: boolean;
  ttlMs: number;
  cachedAt: number | null;
} {
  return {
    enabled,
    warm: entry != null,
    ttlMs,
    cachedAt: entry?.cachedAt ?? null,
  };
}
