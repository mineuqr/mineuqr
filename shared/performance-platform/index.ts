/**
 * PERFORMANCE-PLATFORM-ARCHITECTURE-1
 * Shared Performance Platform architecture barrel.
 * Architecture / catalog only — no collectors, no APIs, no runtime hooks.
 */

export {
  PERFORMANCE_PLATFORM_PROGRAM,
  PERFORMANCE_DOMAINS,
  PERFORMANCE_DOMAIN_DEFINITIONS,
  type PerformanceDomainId,
  type PerformanceDomainMaturity,
  type PerformanceDomainDefinition,
} from "./domains";

export {
  PERFORMANCE_METRICS_CATALOG,
  listPerformanceMetricsByDomain,
  listRealtimeSsotProjections,
  type PerformanceMetricUnit,
  type PerformanceMetricSource,
  type PerformanceMetricDefinition,
} from "./metricsCatalog";

export {
  PERFORMANCE_HEALTH_STATUSES,
  PERFORMANCE_HEALTH_RULE_ARCHITECTURE,
  type PerformanceHealthStatus,
  type PerformanceHealthThresholdBand,
  type PerformanceHealthRuleArchitecture,
} from "./health";

export {
  PERFORMANCE_SCORE_DIMENSIONS,
  PERFORMANCE_SCORE_ARCHITECTURE,
  type PerformanceScoreDimension,
  type PerformanceScoreDimensionArchitecture,
} from "./score";

export {
  PERFORMANCE_TREND_WINDOWS,
  PERFORMANCE_TREND_WINDOW_ARCHITECTURE,
  PERFORMANCE_TREND_KINDS,
  type PerformanceTrendWindow,
  type PerformanceTrendKind,
  type PerformanceTrendWindowArchitecture,
} from "./trends";

export {
  PERFORMANCE_CAPACITY_SIGNALS,
  PERFORMANCE_CAPACITY_ARCHITECTURE,
  type PerformanceCapacitySignalId,
  type PerformanceCapacitySignalArchitecture,
} from "./capacity";

export {
  PERFORMANCE_INTEGRATION_MATRIX,
  PERFORMANCE_ALERT_EXAMPLES,
  type PerformanceIntegrationMode,
  type PerformanceIntegrationDefinition,
  type PerformanceAlertExampleId,
} from "./integrations";

export {
  PERFORMANCE_DASHBOARD_SECTIONS,
  PERFORMANCE_DASHBOARD_ARCHITECTURE,
  PERFORMANCE_DASHBOARD_HOST_PATH,
  type PerformanceDashboardSectionId,
  type PerformanceDashboardSectionArchitecture,
} from "./dashboard";

export {
  PERFORMANCE_PLATFORM_OWNS,
  PERFORMANCE_PLATFORM_DOES_NOT_OWN,
  PERFORMANCE_PIPELINE_STAGES,
  PERFORMANCE_ARCHITECTURE_PRINCIPLES,
  type PerformancePlatformOwns,
  type PerformancePlatformDoesNotOwn,
  type PerformancePipelineStage,
} from "./ownership";
