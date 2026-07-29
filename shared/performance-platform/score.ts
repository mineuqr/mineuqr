/**
 * PERFORMANCE-PLATFORM-ARCHITECTURE-1
 * Performance Score — dimensions only; scoring implementation deferred.
 */

export const PERFORMANCE_SCORE_DIMENSIONS = [
  "api",
  "database",
  "realtime",
  "client",
  "infrastructure",
  "reporting",
  "overall",
] as const;

export type PerformanceScoreDimension =
  (typeof PERFORMANCE_SCORE_DIMENSIONS)[number];

export type PerformanceScoreDimensionArchitecture = {
  id: PerformanceScoreDimension;
  title: string;
  /** Domains contributing to this dimension (architecture mapping). */
  contributesFrom: readonly string[];
  scoringImplemented: false;
};

export const PERFORMANCE_SCORE_ARCHITECTURE: readonly PerformanceScoreDimensionArchitecture[] =
  [
    {
      id: "api",
      title: "API",
      contributesFrom: ["api"],
      scoringImplemented: false,
    },
    {
      id: "database",
      title: "Database",
      contributesFrom: ["database"],
      scoringImplemented: false,
    },
    {
      id: "realtime",
      title: "Realtime",
      contributesFrom: ["realtime"],
      scoringImplemented: false,
    },
    {
      id: "client",
      title: "Client",
      contributesFrom: ["client", "rendering"],
      scoringImplemented: false,
    },
    {
      id: "infrastructure",
      title: "Infrastructure",
      contributesFrom: ["network", "storage", "platform_startup", "authentication"],
      scoringImplemented: false,
    },
    {
      id: "reporting",
      title: "Reporting",
      contributesFrom: ["reporting", "printing"],
      scoringImplemented: false,
    },
    {
      id: "overall",
      title: "Overall Platform",
      contributesFrom: [
        "api",
        "database",
        "realtime",
        "client",
        "infrastructure",
        "reporting",
      ],
      scoringImplemented: false,
    },
  ] as const;
