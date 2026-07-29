/**
 * PERFORMANCE-PLATFORM-ARCHITECTURE-1
 * Metrics catalog — names & ownership only. No collectors.
 */

import type { PerformanceDomainId } from "./domains";

export type PerformanceMetricUnit =
  | "count"
  | "gauge"
  | "ms"
  | "micros"
  | "ratio"
  | "bytes"
  | "score";

export type PerformanceMetricSource =
  /** Owned by Performance Platform when collection is implemented. */
  | "performance_platform"
  /** Must be read from Realtime Observability SSOT only. */
  | "realtime_observability_ssot"
  /** Future Jobs / Queue platforms. */
  | "reserved_future"
  /** Existing logs/metrics adapters (no new parallel store). */
  | "existing_platform_signals";

export type PerformanceMetricDefinition = {
  id: string;
  domain: PerformanceDomainId;
  description: string;
  unit: PerformanceMetricUnit;
  source: PerformanceMetricSource;
  /** When source is realtime_observability_ssot — catalog id in Realtime SSOT. */
  realtimeMetricId?: string;
};

/**
 * Architecture catalog. Realtime rows are projections of existing SSOT ids —
 * they must not be collected again by Performance Platform.
 */
export const PERFORMANCE_METRICS_CATALOG: readonly PerformanceMetricDefinition[] =
  [
    // —— API ——
    { id: "api.request_count", domain: "api", description: "HTTP request count", unit: "count", source: "performance_platform" },
    { id: "api.duration_avg_ms", domain: "api", description: "Average request duration", unit: "ms", source: "performance_platform" },
    { id: "api.duration_p50_ms", domain: "api", description: "Request duration P50", unit: "ms", source: "performance_platform" },
    { id: "api.duration_p95_ms", domain: "api", description: "Request duration P95", unit: "ms", source: "performance_platform" },
    { id: "api.duration_p99_ms", domain: "api", description: "Request duration P99", unit: "ms", source: "performance_platform" },
    { id: "api.slow_endpoints", domain: "api", description: "Slow endpoint ranking set", unit: "gauge", source: "performance_platform" },
    { id: "api.error_rate", domain: "api", description: "HTTP error rate", unit: "ratio", source: "performance_platform" },
    { id: "api.throughput", domain: "api", description: "Requests per second", unit: "gauge", source: "performance_platform" },
    { id: "api.concurrency", domain: "api", description: "In-flight request concurrency", unit: "gauge", source: "performance_platform" },
    { id: "api.endpoint_ranking", domain: "api", description: "Endpoint latency ranking", unit: "gauge", source: "performance_platform" },

    // —— Database ——
    { id: "db.query_duration_ms", domain: "database", description: "Query duration samples", unit: "ms", source: "performance_platform" },
    { id: "db.query_p50_ms", domain: "database", description: "Query duration P50", unit: "ms", source: "performance_platform" },
    { id: "db.query_p95_ms", domain: "database", description: "Query duration P95", unit: "ms", source: "performance_platform" },
    { id: "db.query_p99_ms", domain: "database", description: "Query duration P99", unit: "ms", source: "performance_platform" },
    { id: "db.slow_queries", domain: "database", description: "Slow query set", unit: "gauge", source: "performance_platform" },
    { id: "db.connection_usage", domain: "database", description: "Connection usage", unit: "gauge", source: "performance_platform" },
    { id: "db.pool_health", domain: "database", description: "Pool health signal", unit: "gauge", source: "performance_platform" },
    { id: "db.transaction_duration_ms", domain: "database", description: "Transaction duration", unit: "ms", source: "performance_platform" },
    { id: "db.migration_duration_ms", domain: "database", description: "Migration performance", unit: "ms", source: "performance_platform" },
    { id: "db.read_vs_write", domain: "database", description: "Read vs write ratio", unit: "ratio", source: "performance_platform" },

    // —— Realtime (SSOT consumer only) ——
    {
      id: "realtime.connections.active",
      domain: "realtime",
      description: "Active SSE connections",
      unit: "gauge",
      source: "realtime_observability_ssot",
      realtimeMetricId: "connections.active",
    },
    {
      id: "realtime.latency.publish_to_deliver_ms",
      domain: "realtime",
      description: "Hint publish→deliver latency",
      unit: "ms",
      source: "realtime_observability_ssot",
      realtimeMetricId: "latency.publish_to_deliver_ms",
    },
    {
      id: "realtime.reconnects.attempts",
      domain: "realtime",
      description: "Reconnect attempts",
      unit: "count",
      source: "realtime_observability_ssot",
      realtimeMetricId: "reconnects.attempts",
    },
    {
      id: "realtime.fallback.activations",
      domain: "realtime",
      description: "Fallback activations",
      unit: "count",
      source: "realtime_observability_ssot",
      realtimeMetricId: "fallback.activations",
    },
    {
      id: "realtime.latency.auth_ms",
      domain: "realtime",
      description: "Authorization duration",
      unit: "ms",
      source: "realtime_observability_ssot",
      realtimeMetricId: "latency.auth_ms",
    },
    {
      id: "realtime.registry.lookup_latency_micros",
      domain: "realtime",
      description: "Registry lookup duration",
      unit: "micros",
      source: "realtime_observability_ssot",
      realtimeMetricId: "registry.lookup_latency_micros",
    },
    {
      id: "realtime.subscriptions.active",
      domain: "realtime",
      description: "Channel subscription health proxy",
      unit: "gauge",
      source: "realtime_observability_ssot",
      realtimeMetricId: "subscriptions.active",
    },

    // —— Client ——
    { id: "client.initial_load_ms", domain: "client", description: "Initial load", unit: "ms", source: "performance_platform" },
    { id: "client.navigation_ms", domain: "client", description: "Client navigation duration", unit: "ms", source: "performance_platform" },
    { id: "client.hydration_ms", domain: "client", description: "Hydration duration", unit: "ms", source: "performance_platform" },
    { id: "client.render_ms", domain: "client", description: "Render duration", unit: "ms", source: "performance_platform" },
    { id: "client.lcp_ms", domain: "client", description: "Largest Contentful Paint", unit: "ms", source: "performance_platform" },
    { id: "client.interaction_delay_ms", domain: "client", description: "Interaction delay", unit: "ms", source: "performance_platform" },
    { id: "client.frame_stability", domain: "client", description: "Frame stability score", unit: "ratio", source: "performance_platform" },
    { id: "client.bundle_load_ms", domain: "client", description: "Bundle load duration", unit: "ms", source: "performance_platform" },

    // —— Background jobs (reserved) ——
    { id: "jobs.execution_ms", domain: "background_jobs", description: "Job execution time", unit: "ms", source: "reserved_future" },
    { id: "jobs.success_rate", domain: "background_jobs", description: "Job success rate", unit: "ratio", source: "reserved_future" },
    { id: "jobs.failure_rate", domain: "background_jobs", description: "Job failure rate", unit: "ratio", source: "reserved_future" },
    { id: "jobs.retries", domain: "background_jobs", description: "Job retries", unit: "count", source: "reserved_future" },
    { id: "jobs.queue_time_ms", domain: "background_jobs", description: "Time in queue", unit: "ms", source: "reserved_future" },
    { id: "jobs.worker_utilization", domain: "background_jobs", description: "Worker utilization", unit: "ratio", source: "reserved_future" },

    // —— Queues (reserved) ——
    { id: "queue.length", domain: "queues", description: "Queue length", unit: "gauge", source: "reserved_future" },
    { id: "queue.wait_ms", domain: "queues", description: "Waiting time", unit: "ms", source: "reserved_future" },
    { id: "queue.process_ms", domain: "queues", description: "Processing time", unit: "ms", source: "reserved_future" },
    { id: "queue.failures", domain: "queues", description: "Queue failures", unit: "count", source: "reserved_future" },
    { id: "queue.retries", domain: "queues", description: "Queue retries", unit: "count", source: "reserved_future" },
    { id: "queue.dead_letters", domain: "queues", description: "Dead letters", unit: "count", source: "reserved_future" },

    // —— Reporting ——
    { id: "reporting.dashboard_load_ms", domain: "reporting", description: "Dashboard load", unit: "ms", source: "performance_platform" },
    { id: "reporting.kpi_generation_ms", domain: "reporting", description: "KPI generation", unit: "ms", source: "performance_platform" },
    { id: "reporting.export_ms", domain: "reporting", description: "Export duration", unit: "ms", source: "performance_platform" },
    { id: "reporting.excel_ms", domain: "reporting", description: "Excel generation", unit: "ms", source: "performance_platform" },
    { id: "reporting.pdf_ms", domain: "reporting", description: "PDF generation", unit: "ms", source: "performance_platform" },
    { id: "reporting.aggregation_ms", domain: "reporting", description: "Aggregation time", unit: "ms", source: "performance_platform" },

    // —— Authentication ——
    { id: "auth.login_ms", domain: "authentication", description: "Login duration", unit: "ms", source: "performance_platform" },
    { id: "auth.token_validation_ms", domain: "authentication", description: "Token validation", unit: "ms", source: "performance_platform" },
    { id: "auth.session_resolution_ms", domain: "authentication", description: "Session resolution", unit: "ms", source: "performance_platform" },
    { id: "auth.permission_resolution_ms", domain: "authentication", description: "Permission resolution", unit: "ms", source: "performance_platform" },

    // —— Storage ——
    { id: "storage.upload_ms", domain: "storage", description: "Upload time", unit: "ms", source: "performance_platform" },
    { id: "storage.download_ms", domain: "storage", description: "Download time", unit: "ms", source: "performance_platform" },
    { id: "storage.image_processing_ms", domain: "storage", description: "Image processing", unit: "ms", source: "performance_platform" },
    { id: "storage.pdf_storage_ms", domain: "storage", description: "PDF storage", unit: "ms", source: "performance_platform" },
    { id: "storage.r2_latency_ms", domain: "storage", description: "R2 latency", unit: "ms", source: "performance_platform" },
    { id: "storage.fallback_usage", domain: "storage", description: "Storage fallback usage", unit: "count", source: "performance_platform" },

    // —— Rendering / network / printing / startup (deferred catalog rows) ——
    { id: "rendering.frame_stability", domain: "rendering", description: "Render frame stability", unit: "ratio", source: "performance_platform" },
    { id: "network.rtt_ms", domain: "network", description: "Network RTT aggregate", unit: "ms", source: "existing_platform_signals" },
    { id: "printing.job_ms", domain: "printing", description: "Print job duration", unit: "ms", source: "performance_platform" },
    { id: "startup.boot_ms", domain: "platform_startup", description: "Platform startup duration", unit: "ms", source: "performance_platform" },
  ] as const;

export function listPerformanceMetricsByDomain(domain: PerformanceDomainId) {
  return PERFORMANCE_METRICS_CATALOG.filter((m) => m.domain === domain);
}

export function listRealtimeSsotProjections() {
  return PERFORMANCE_METRICS_CATALOG.filter(
    (m) => m.source === "realtime_observability_ssot"
  );
}
