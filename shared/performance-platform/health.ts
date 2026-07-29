/**
 * PERFORMANCE-PLATFORM-ARCHITECTURE-1
 * Performance health model — architecture only (thresholds deferred to config).
 */

export const PERFORMANCE_HEALTH_STATUSES = [
  "healthy",
  "warning",
  "degraded",
  "critical",
  "unknown",
] as const;

export type PerformanceHealthStatus =
  (typeof PERFORMANCE_HEALTH_STATUSES)[number];

export type PerformanceHealthThresholdBand = {
  status: Exclude<PerformanceHealthStatus, "unknown">;
  /** Inclusive lower bound in metric units (architecture placeholder). */
  minInclusive?: number;
  /** Exclusive upper bound in metric units (architecture placeholder). */
  maxExclusive?: number;
};

export type PerformanceHealthRuleArchitecture = {
  id: string;
  metricId: string;
  description: string;
  /** Threshold bands are configurable; values not enforced in this program. */
  bands: readonly PerformanceHealthThresholdBand[];
  configurable: true;
};

/**
 * Example threshold-driven rules — architecture sketches only.
 * No evaluation runtime in this program.
 */
export const PERFORMANCE_HEALTH_RULE_ARCHITECTURE: readonly PerformanceHealthRuleArchitecture[] =
  [
    {
      id: "api.p95.latency",
      metricId: "api.duration_p95_ms",
      description: "API P95 latency bands",
      configurable: true,
      bands: [
        { status: "healthy", maxExclusive: 300 },
        { status: "warning", minInclusive: 300, maxExclusive: 800 },
        { status: "degraded", minInclusive: 800, maxExclusive: 2000 },
        { status: "critical", minInclusive: 2000 },
      ],
    },
    {
      id: "db.p95.latency",
      metricId: "db.query_p95_ms",
      description: "Database P95 latency bands",
      configurable: true,
      bands: [
        { status: "healthy", maxExclusive: 100 },
        { status: "warning", minInclusive: 100, maxExclusive: 400 },
        { status: "degraded", minInclusive: 400, maxExclusive: 1000 },
        { status: "critical", minInclusive: 1000 },
      ],
    },
    {
      id: "realtime.latency.ssot",
      metricId: "realtime.latency.publish_to_deliver_ms",
      description: "Realtime publish→deliver — mapped from Observability health, not re-ruled here",
      configurable: true,
      bands: [
        { status: "healthy", maxExclusive: 500 },
        { status: "warning", minInclusive: 500, maxExclusive: 1500 },
        { status: "degraded", minInclusive: 1500, maxExclusive: 3000 },
        { status: "critical", minInclusive: 3000 },
      ],
    },
  ] as const;
