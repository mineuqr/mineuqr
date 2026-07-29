/**
 * OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1
 * Data ownership boundaries.
 */

export const RUNTIME_PLATFORM_OWNS = [
  "job_metadata",
  "queue_metadata",
  "worker_metadata",
  "execution_metadata",
  "runtime_diagnostics",
  "runtime_timeline",
  "runtime_health",
] as const;

export const RUNTIME_PLATFORM_DOES_NOT_OWN = [
  "orders",
  "sessions",
  "checks",
  "reporting",
  "realtime_transport",
  "authentication",
  "business_events",
  "business_entities",
  "settlement",
] as const;

export const RUNTIME_ARCHITECTURE_PRINCIPLES = [
  "owns_runtime_infrastructure",
  "never_owns_business_entities",
  "business_domains_publish_facts",
  "runtime_executes_infrastructure_work",
  "read_only_diagnostics",
  "no_duplicate_collectors",
  "respect_existing_adrs",
] as const;

export type RuntimePlatformOwns = (typeof RUNTIME_PLATFORM_OWNS)[number];
export type RuntimePlatformDoesNotOwn =
  (typeof RUNTIME_PLATFORM_DOES_NOT_OWN)[number];
