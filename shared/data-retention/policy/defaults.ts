/**
 * DATA-RETENTION-PLATFORM-1 — safe platform defaults (ADR-ARCH-031 § defaults).
 */

import {
  DRAP_DEFAULT_ARCHIVE_RETENTION_DAYS,
  DRAP_DEFAULT_DISPLAY_WINDOW_DAYS,
  DRAP_DEFAULT_OPERATIONAL_RETENTION_DAYS,
  DRAP_PLATFORM_FALLBACK_POLICY_ID,
} from "../constants";
import type { RetentionEntityType, RetentionPolicy } from "../types";

const EPOCH = "1970-01-01T00:00:00.000Z";

export function buildPlatformFallbackPolicy(
  entityType: RetentionEntityType,
  nowIso: string = EPOCH
): RetentionPolicy {
  return {
    policyId: `${DRAP_PLATFORM_FALLBACK_POLICY_ID}.${entityType}`,
    entityType,
    enabled: true,
    displayWindowDays: DRAP_DEFAULT_DISPLAY_WINDOW_DAYS,
    operationalRetentionDays: DRAP_DEFAULT_OPERATIONAL_RETENTION_DAYS,
    archiveRetentionDays: DRAP_DEFAULT_ARCHIVE_RETENTION_DAYS,
    archiveEnabled: true,
    restoreEnabled: true,
    /** Safe default: purge disabled (DR-07 / DR-12). */
    purgeEnabled: false,
    legalHoldSupported: true,
    defaultPolicy: true,
    restaurantOverrideAllowed: true,
    version: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
    restaurantId: null,
  };
}

/** Settlement records: Permanent class — archive optional, purge never. */
export function buildSettlementRecordSafePolicy(
  nowIso: string = EPOCH
): RetentionPolicy {
  return {
    ...buildPlatformFallbackPolicy("settlement_record", nowIso),
    policyId: "drap.policy.settlement_record.permanent",
    archiveEnabled: false,
    restoreEnabled: false,
    purgeEnabled: false,
    legalHoldSupported: true,
  };
}
