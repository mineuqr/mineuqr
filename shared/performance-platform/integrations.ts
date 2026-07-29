/**
 * PERFORMANCE-PLATFORM-ARCHITECTURE-1
 * Integration matrix — consume existing platforms; no duplication.
 */

export type PerformanceIntegrationMode =
  | "consume_ssot"
  | "present_only"
  | "emit_to_alerts"
  | "reserved";

export type PerformanceIntegrationDefinition = {
  id: string;
  partner: string;
  mode: PerformanceIntegrationMode;
  ownsData: boolean;
  notes: string;
};

export const PERFORMANCE_INTEGRATION_MATRIX: readonly PerformanceIntegrationDefinition[] =
  [
    {
      id: "realtime_observability",
      partner: "REALTIME-PLATFORM-OBSERVABILITY-1",
      mode: "consume_ssot",
      ownsData: false,
      notes: "Dashboard/alerts for Realtime metrics come from observability APIs only.",
    },
    {
      id: "platform_health",
      partner: "Platform System Health",
      mode: "consume_ssot",
      ownsData: false,
      notes: "Map performance health into Platform Ops Health presentation when wired.",
    },
    {
      id: "existing_metrics",
      partner: "Existing metrics / logging",
      mode: "consume_ssot",
      ownsData: false,
      notes: "Prefer adapters over new collectors when signals already exist.",
    },
    {
      id: "platform_alerts",
      partner: "Platform Alert System",
      mode: "emit_to_alerts",
      ownsData: false,
      notes: "Propose alert signals (slow API, DB latency, …); do not fork Alert Platform.",
    },
    {
      id: "platform_ops_ui",
      partner: "PLATFORM-OPERATIONS-UI-FOUNDATION-1",
      mode: "present_only",
      ownsData: false,
      notes: "All Performance UI uses platform-ops-ui facades only.",
    },
    {
      id: "jobs_platform",
      partner: "Background Jobs (future)",
      mode: "reserved",
      ownsData: false,
      notes: "No Jobs implementation in this program.",
    },
    {
      id: "queue_platform",
      partner: "Queue Platform (future)",
      mode: "reserved",
      ownsData: false,
      notes: "No Queue implementation in this program.",
    },
  ] as const;

/** Alert examples — architecture proposals only. */
export const PERFORMANCE_ALERT_EXAMPLES = [
  "slow_api",
  "high_db_latency",
  "slow_reporting",
  "realtime_regression",
  "storage_delay",
  "queue_backlog",
  "high_error_rate",
] as const;

export type PerformanceAlertExampleId =
  (typeof PERFORMANCE_ALERT_EXAMPLES)[number];
