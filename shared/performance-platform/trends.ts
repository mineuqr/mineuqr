/**
 * PERFORMANCE-PLATFORM-ARCHITECTURE-1
 * Trend analysis windows — architecture only.
 */

export const PERFORMANCE_TREND_WINDOWS = [
  "last_hour",
  "hours_24",
  "days_7",
  "days_30",
] as const;

export type PerformanceTrendWindow = (typeof PERFORMANCE_TREND_WINDOWS)[number];

export type PerformanceTrendKind =
  | "trend"
  | "regression"
  | "improvement";

export type PerformanceTrendWindowArchitecture = {
  id: PerformanceTrendWindow;
  title: string;
  durationLabel: string;
};

export const PERFORMANCE_TREND_WINDOW_ARCHITECTURE: readonly PerformanceTrendWindowArchitecture[] =
  [
    { id: "last_hour", title: "Last Hour", durationLabel: "1h" },
    { id: "hours_24", title: "24 Hours", durationLabel: "24h" },
    { id: "days_7", title: "7 Days", durationLabel: "7d" },
    { id: "days_30", title: "30 Days", durationLabel: "30d" },
  ] as const;

export const PERFORMANCE_TREND_KINDS: readonly PerformanceTrendKind[] = [
  "trend",
  "regression",
  "improvement",
] as const;
