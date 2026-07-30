/**
 * COMMERCIAL-CATALOG-PRODUCTION-POLISH-1
 * Localized commercial display for feature/limit keys (never show raw identifiers).
 * COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1 — display keys = Capability Filter SSOT.
 */

import type { Language } from "@/contexts/LanguageContext";
import {
  COMMERCIAL_CAPABILITY_FILTER_KEYS,
  COMMERCIAL_LIMIT_FILTER_KEYS,
} from "@shared/commercial-capability";

export const CATALOG_FEATURE_DISPLAY_KEYS = COMMERCIAL_CAPABILITY_FILTER_KEYS;

export type CatalogFeatureDisplayKey =
  (typeof CATALOG_FEATURE_DISPLAY_KEYS)[number];

export const CATALOG_LIMIT_DISPLAY_KEYS = COMMERCIAL_LIMIT_FILTER_KEYS;

export type CatalogLimitDisplayKey =
  (typeof CATALOG_LIMIT_DISPLAY_KEYS)[number];

const PREFIX = "admin.platformOps.commercialCatalog.";

export function catalogFeatureNameKey(key: string): string {
  return `${PREFIX}features.${key}.name`;
}

export function catalogFeatureDescriptionKey(key: string): string {
  return `${PREFIX}features.${key}.description`;
}

export function catalogFeatureTooltipKey(key: string): string {
  return `${PREFIX}features.${key}.tooltip`;
}

export function catalogFeatureCategoryKey(key: string): string {
  return `${PREFIX}features.${key}.category`;
}

export function catalogLimitNameKey(key: string): string {
  return `${PREFIX}limits.${key}.name`;
}

export function catalogLimitDescriptionKey(key: string): string {
  return `${PREFIX}limits.${key}.description`;
}

/** Resolve display label; never fall back to the technical key. */
export function resolveCatalogLabel(
  t: (key: string) => string,
  keyPath: string,
  fallbackEn: string
): string {
  const value = t(keyPath);
  if (!value || value === keyPath) return fallbackEn;
  return value;
}

export function yearlySavingsPercent(
  monthly: number,
  yearly: number
): number | null {
  if (!Number.isFinite(monthly) || !Number.isFinite(yearly) || monthly <= 0) {
    return null;
  }
  const fullYear = monthly * 12;
  if (fullYear <= 0) return null;
  const pct = Math.round(((fullYear - yearly) / fullYear) * 100);
  return pct > 0 ? pct : null;
}
