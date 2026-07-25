/**
 * DATA-RETENTION-PLATFORM-1 — feature flags (safe defaults).
 */

import type { RetentionFeatureFlags } from "./types";

export const DEFAULT_RETENTION_FEATURE_FLAGS: RetentionFeatureFlags = {
  drapEnabled: true,
  schedulerEnabled: true,
  archiveJobsEnabled: false,
  restoreJobsEnabled: false,
  /** Purge jobs off until LEGAL-HOLD-AND-PURGE successor. */
  purgeJobsEnabled: false,
  simulationMode: false,
  dryRunDefault: true,
};

export function mergeRetentionFeatureFlags(
  overrides: Partial<RetentionFeatureFlags> = {}
): RetentionFeatureFlags {
  return { ...DEFAULT_RETENTION_FEATURE_FLAGS, ...overrides };
}
