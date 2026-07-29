/**
 * OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1
 * Operations dashboard — maps to existing Platform Ops paths (no new App routes).
 */

export const RUNTIME_DASHBOARD_SECTIONS = [
  "overview",
  "jobs",
  "queues",
  "workers",
  "events",
  "diagnostics",
  "history",
  "health",
] as const;

export type RuntimeDashboardSectionId =
  (typeof RUNTIME_DASHBOARD_SECTIONS)[number];

export type RuntimeDashboardSectionArchitecture = {
  id: RuntimeDashboardSectionId;
  title: string;
  maturity: "architecture" | "reserved";
  /** Existing Platform Ops host path (IA). Nested fragments deferred. */
  hostPath: string;
  uiFoundation: "platform-ops-ui";
};

export const RUNTIME_DASHBOARD_ARCHITECTURE: readonly RuntimeDashboardSectionArchitecture[] =
  [
    {
      id: "overview",
      title: "Overview",
      maturity: "architecture",
      hostPath: "/admin/platform/jobs",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "jobs",
      title: "Jobs",
      maturity: "architecture",
      hostPath: "/admin/platform/jobs",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "queues",
      title: "Queues",
      maturity: "reserved",
      hostPath: "/admin/platform/jobs",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "workers",
      title: "Workers",
      maturity: "reserved",
      hostPath: "/admin/platform/jobs",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "events",
      title: "Events",
      maturity: "architecture",
      hostPath: "/admin/platform/events",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "diagnostics",
      title: "Diagnostics",
      maturity: "architecture",
      hostPath: "/admin/platform/diagnostics",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "history",
      title: "History",
      maturity: "reserved",
      hostPath: "/admin/platform/diagnostics",
      uiFoundation: "platform-ops-ui",
    },
    {
      id: "health",
      title: "Health",
      maturity: "architecture",
      hostPath: "/admin/platform/diagnostics",
      uiFoundation: "platform-ops-ui",
    },
  ] as const;

export const RUNTIME_DASHBOARD_HOST_PATHS = {
  jobs: "/admin/platform/jobs",
  events: "/admin/platform/events",
  diagnostics: "/admin/platform/diagnostics",
} as const;
