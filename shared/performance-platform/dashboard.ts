/**
 * PERFORMANCE-PLATFORM-ARCHITECTURE-1
 * Dashboard section architecture under Platform Operations → Performance.
 * Nested routes deferred — section ids are architecture only.
 */

export const PERFORMANCE_DASHBOARD_SECTIONS = [
  "overview",
  "api",
  "database",
  "realtime",
  "client",
  "storage",
  "reporting",
  "background_jobs",
  "queues",
  "reserved",
] as const;

export type PerformanceDashboardSectionId =
  (typeof PERFORMANCE_DASHBOARD_SECTIONS)[number];

export type PerformanceDashboardSectionArchitecture = {
  id: PerformanceDashboardSectionId;
  title: string;
  maturity: "architecture" | "ssot_consumer" | "reserved";
  /** Path fragment under /admin/platform/performance (not wired in this program). */
  pathFragment: string;
  uiFoundation: "platform-ops-ui";
};

export const PERFORMANCE_DASHBOARD_ARCHITECTURE: readonly PerformanceDashboardSectionArchitecture[] =
  [
    {
      id: "overview",
      title: "Overview",
      maturity: "architecture",
      pathFragment: "",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "api",
      title: "API",
      maturity: "architecture",
      pathFragment: "api",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "database",
      title: "Database",
      maturity: "architecture",
      pathFragment: "database",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "realtime",
      title: "Realtime",
      maturity: "ssot_consumer",
      pathFragment: "realtime",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "client",
      title: "Client",
      maturity: "architecture",
      pathFragment: "client",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "storage",
      title: "Storage",
      maturity: "architecture",
      pathFragment: "storage",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "reporting",
      title: "Reporting",
      maturity: "architecture",
      pathFragment: "reporting",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "background_jobs",
      title: "Background Jobs",
      maturity: "reserved",
      pathFragment: "jobs",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "queues",
      title: "Queues",
      maturity: "reserved",
      pathFragment: "queues",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "reserved",
      title: "Reserved",
      maturity: "reserved",
      pathFragment: "reserved",
      uiFoundation: "platform-ops-ui",
    },
  ] as const;

/** Canonical host path — existing IA route; no new App routes in this program. */
export const PERFORMANCE_DASHBOARD_HOST_PATH =
  "/admin/platform/performance" as const;
