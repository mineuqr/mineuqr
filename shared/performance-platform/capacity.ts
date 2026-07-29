/**
 * PERFORMANCE-PLATFORM-ARCHITECTURE-1
 * Capacity planning — reserved architecture only.
 */

export const PERFORMANCE_CAPACITY_SIGNALS = [
  "peak_usage",
  "growth_trends",
  "connection_forecast",
  "traffic_forecast",
  "storage_forecast",
  "database_growth",
] as const;

export type PerformanceCapacitySignalId =
  (typeof PERFORMANCE_CAPACITY_SIGNALS)[number];

export type PerformanceCapacitySignalArchitecture = {
  id: PerformanceCapacitySignalId;
  title: string;
  maturity: "reserved";
  notes: string;
};

export const PERFORMANCE_CAPACITY_ARCHITECTURE: readonly PerformanceCapacitySignalArchitecture[] =
  [
    {
      id: "peak_usage",
      title: "Peak Usage",
      maturity: "reserved",
      notes: "Future peak detection across API/Realtime/DB.",
    },
    {
      id: "growth_trends",
      title: "Growth Trends",
      maturity: "reserved",
      notes: "Long-window growth from trend stores.",
    },
    {
      id: "connection_forecast",
      title: "Connection Forecast",
      maturity: "reserved",
      notes: "Consumes Realtime connection gauges — no parallel counter.",
    },
    {
      id: "traffic_forecast",
      title: "Traffic Forecast",
      maturity: "reserved",
      notes: "API throughput projections.",
    },
    {
      id: "storage_forecast",
      title: "Storage Forecast",
      maturity: "reserved",
      notes: "Object storage growth.",
    },
    {
      id: "database_growth",
      title: "Database Growth",
      maturity: "reserved",
      notes: "DB size / connection growth projections.",
    },
  ] as const;
