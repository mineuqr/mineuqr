/**
 * PERFORMANCE-PLATFORM-ARCHITECTURE-1
 * Domain ownership — architecture SSOT only (no collectors / runtime).
 */

export const PERFORMANCE_PLATFORM_PROGRAM =
  "PERFORMANCE-PLATFORM-ARCHITECTURE-1" as const;

/** Operational performance domains owned or reserved by the Performance Platform. */
export const PERFORMANCE_DOMAINS = [
  "api",
  "database",
  "realtime",
  "background_jobs",
  "queues",
  "rendering",
  "client",
  "network",
  "storage",
  "authentication",
  "reporting",
  "printing",
  "platform_startup",
] as const;

export type PerformanceDomainId = (typeof PERFORMANCE_DOMAINS)[number];

export type PerformanceDomainMaturity =
  | "architecture"
  /** Consumes an existing SSOT; no parallel collection. */
  | "ssot_consumer"
  /** Ownership reserved; implementation deferred. */
  | "reserved"
  /** Metric collection / aggregation not yet implemented. */
  | "deferred";

export type PerformanceDomainDefinition = {
  id: PerformanceDomainId;
  title: string;
  ownership: string;
  maturity: PerformanceDomainMaturity;
  /** When maturity is ssot_consumer — authoritative owner package. */
  ssotOwner?: string;
  notes: string;
};

export const PERFORMANCE_DOMAIN_DEFINITIONS: readonly PerformanceDomainDefinition[] =
  [
    {
      id: "api",
      title: "API Performance",
      ownership: "Performance Platform (presentation + future aggregation)",
      maturity: "architecture",
      notes: "Request duration percentiles, throughput, slow endpoints, error rate.",
    },
    {
      id: "database",
      title: "Database Performance",
      ownership: "Performance Platform (presentation + future aggregation)",
      maturity: "architecture",
      notes: "Query latency, pool health, read/write mix — no query rewriting.",
    },
    {
      id: "realtime",
      title: "Realtime Performance",
      ownership: "Realtime Platform Observability (SSOT)",
      maturity: "ssot_consumer",
      ssotOwner: "server/realtime-platform/observability",
      notes: "Display-only. Never duplicate Realtime collectors or catalogs.",
    },
    {
      id: "background_jobs",
      title: "Background Jobs",
      ownership: "Reserved — Jobs Platform future",
      maturity: "reserved",
      notes: "Execution time, success/failure, retries — no implementation in this program.",
    },
    {
      id: "queues",
      title: "Queue Performance",
      ownership: "Reserved — Queue Platform future",
      maturity: "reserved",
      notes: "Depth, wait/process time, dead letters — future integration only.",
    },
    {
      id: "rendering",
      title: "Rendering Performance",
      ownership: "Performance Platform (client signals)",
      maturity: "deferred",
      notes: "Frame stability and render cost — telemetry only, no UX changes here.",
    },
    {
      id: "client",
      title: "Client Performance",
      ownership: "Performance Platform (client signals)",
      maturity: "architecture",
      notes: "Load, hydration, LCP, interaction delay, bundle load.",
    },
    {
      id: "network",
      title: "Network Performance",
      ownership: "Performance Platform (presentation + future aggregation)",
      maturity: "deferred",
      notes: "Edge/RTT aggregates — no packet capture of business payloads.",
    },
    {
      id: "storage",
      title: "Storage Performance",
      ownership: "Performance Platform (presentation + future aggregation)",
      maturity: "architecture",
      notes: "Upload/download/R2 latency and fallback usage — operational only.",
    },
    {
      id: "authentication",
      title: "Authentication Performance",
      ownership: "Performance Platform (presentation + future aggregation)",
      maturity: "architecture",
      notes: "Login, token validation, session/permission resolution timings.",
    },
    {
      id: "reporting",
      title: "Reporting Performance",
      ownership: "Performance Platform (presentation + future aggregation)",
      maturity: "architecture",
      notes: "Dashboard/KPI/export/PDF/Excel generation durations.",
    },
    {
      id: "printing",
      title: "Printing Performance",
      ownership: "Performance Platform (presentation + future aggregation)",
      maturity: "deferred",
      notes: "Print job latency — operational timings only.",
    },
    {
      id: "platform_startup",
      title: "Platform Startup",
      ownership: "Performance Platform (presentation + future aggregation)",
      maturity: "deferred",
      notes: "Cold start / boot phases — visibility only.",
    },
  ] as const;
