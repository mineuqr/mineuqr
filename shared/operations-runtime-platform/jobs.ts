/**
 * OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1
 * Background Job Platform — reservation only.
 */

export const JOB_KINDS = [
  "scheduled",
  "one_time",
  "recurring",
  "delayed",
] as const;

export type JobKind = (typeof JOB_KINDS)[number];

export const JOB_PLATFORM_CAPABILITIES = [
  "retry_policy",
  "failure_policy",
  "concurrency",
  "priority",
  "worker_allocation",
] as const;

export type JobPlatformCapability = (typeof JOB_PLATFORM_CAPABILITIES)[number];

export type JobPlatformCapabilityArchitecture = {
  id: JobPlatformCapability | JobKind;
  title: string;
  maturity: "reserved";
  notes: string;
};

export const JOB_PLATFORM_ARCHITECTURE: readonly JobPlatformCapabilityArchitecture[] =
  [
    { id: "scheduled", title: "Scheduled Jobs", maturity: "reserved", notes: "Cron-like schedules — not implemented." },
    { id: "one_time", title: "One-Time Jobs", maturity: "reserved", notes: "Fire-once execution — not implemented." },
    { id: "recurring", title: "Recurring Jobs", maturity: "reserved", notes: "Recurrence rules — not implemented." },
    { id: "delayed", title: "Delayed Jobs", maturity: "reserved", notes: "Deferred start — not implemented." },
    { id: "retry_policy", title: "Retry Policy", maturity: "reserved", notes: "See retry architecture — not implemented." },
    { id: "failure_policy", title: "Failure Policy", maturity: "reserved", notes: "Escalation / DLQ — not implemented." },
    { id: "concurrency", title: "Concurrency", maturity: "reserved", notes: "Per-job concurrency limits — not implemented." },
    { id: "priority", title: "Priority", maturity: "reserved", notes: "Priority classes — not implemented." },
    { id: "worker_allocation", title: "Worker Allocation", maturity: "reserved", notes: "Worker binding — not implemented." },
  ] as const;
