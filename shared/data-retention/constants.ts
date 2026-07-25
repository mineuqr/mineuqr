/**
 * DATA-RETENTION-PLATFORM-1 / ADR-ARCH-031 —
 * Platform constants and safe defaults. No domain logic.
 */

export const DRAP_PLATFORM_ID = "DATA-RETENTION-PLATFORM-1" as const;
export const DRAP_ADR_ID = "ADR-ARCH-031" as const;

/** Safe platform fallbacks (days). */
export const DRAP_DEFAULT_DISPLAY_WINDOW_DAYS = 30 as const;
export const DRAP_DEFAULT_OPERATIONAL_RETENTION_DAYS = 365 as const;
export const DRAP_DEFAULT_ARCHIVE_RETENTION_DAYS = 2555 as const; // ~7 years cold keep

export const DRAP_PLATFORM_FALLBACK_POLICY_ID =
  "drap.policy.platform_fallback" as const;

export const RETENTION_ENTITY_TYPES = [
  "financial_shift",
  "register",
  "order",
  "check",
  "session",
  "settlement_record",
  "audit_event",
  "notification",
  "print_job",
  "device_log",
  "operational_log",
  "kitchen_history",
  "reporting_snapshot",
  "generic",
] as const;

export const RETENTION_LIFECYCLE_STATES = [
  "ACTIVE",
  "DISPLAY_WINDOW",
  "OPERATIONAL_RETENTION",
  "ARCHIVE_ELIGIBLE",
  "ARCHIVED",
  "RESTORABLE",
  "PURGE_ELIGIBLE",
  "PURGED",
] as const;

export const RETENTION_HOLD_KINDS = [
  "legal_hold",
  "financial_hold",
  "manual_hold",
] as const;

export const RETENTION_SCHEDULER_HOOKS = [
  "archive",
  "restore",
  "purge",
  "dry_run",
  "simulation",
] as const;
