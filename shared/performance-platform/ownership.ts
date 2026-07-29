/**
 * PERFORMANCE-PLATFORM-ARCHITECTURE-1
 * Data ownership boundaries.
 */

export const PERFORMANCE_PLATFORM_OWNS = [
  "performance_presentation",
  "performance_aggregation",
  "performance_analysis",
  "performance_trends",
  "performance_dashboard",
] as const;

export const PERFORMANCE_PLATFORM_DOES_NOT_OWN = [
  "business_metrics",
  "realtime_transport",
  "logging",
  "health_rules",
  "alerts",
  "request_mutation",
  "business_logic",
] as const;

export type PerformancePlatformOwns =
  (typeof PERFORMANCE_PLATFORM_OWNS)[number];

export type PerformancePlatformDoesNotOwn =
  (typeof PERFORMANCE_PLATFORM_DOES_NOT_OWN)[number];

export const PERFORMANCE_PIPELINE_STAGES = [
  "collect",
  "aggregate",
  "analyze",
  "present",
] as const;

export type PerformancePipelineStage =
  (typeof PERFORMANCE_PIPELINE_STAGES)[number];

/** Architecture principles — enforced by guards, not runtime hooks. */
export const PERFORMANCE_ARCHITECTURE_PRINCIPLES = [
  "read_only",
  "observability_consumer",
  "never_business_logic",
  "never_modifies_requests",
  "never_blocks_execution",
] as const;
