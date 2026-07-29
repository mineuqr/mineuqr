/**
 * OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1
 * Runtime health model — architecture only.
 */

export const RUNTIME_HEALTH_STATUSES = [
  "healthy",
  "warning",
  "degraded",
  "critical",
  "offline",
  "unknown",
] as const;

export type RuntimeHealthStatus = (typeof RUNTIME_HEALTH_STATUSES)[number];

export type RuntimeHealthRuleArchitecture = {
  id: string;
  signal: string;
  description: string;
  configurable: true;
  /** Example bands — not evaluated in this program. */
  bands: readonly { status: Exclude<RuntimeHealthStatus, "unknown">; note: string }[];
};

export const RUNTIME_HEALTH_RULE_ARCHITECTURE: readonly RuntimeHealthRuleArchitecture[] =
  [
    {
      id: "queue.depth",
      signal: "queue.length",
      description: "Queue depth threshold bands",
      configurable: true,
      bands: [
        { status: "healthy", note: "within baseline" },
        { status: "warning", note: "elevated depth" },
        { status: "degraded", note: "sustained backlog" },
        { status: "critical", note: "overflow risk" },
        { status: "offline", note: "broker unreachable" },
      ],
    },
    {
      id: "worker.availability",
      signal: "workers.available",
      description: "Worker availability bands",
      configurable: true,
      bands: [
        { status: "healthy", note: "capacity available" },
        { status: "warning", note: "capacity tight" },
        { status: "degraded", note: "undersupplied" },
        { status: "critical", note: "no workers" },
        { status: "offline", note: "worker plane unreachable" },
      ],
    },
  ] as const;
