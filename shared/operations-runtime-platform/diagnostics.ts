/**
 * OPERATIONS-RUNTIME-PLATFORM-ARCHITECTURE-1
 * Runtime Diagnostics — read-only architecture.
 */

export const RUNTIME_DIAGNOSTIC_CAPABILITIES = [
  "job_failures",
  "worker_failures",
  "queue_health",
  "event_failures",
  "retry_analysis",
  "dead_letter_analysis",
  "execution_timeline",
  "failure_correlation",
  "root_cause_analysis",
  "runtime_history",
] as const;

export type RuntimeDiagnosticCapabilityId =
  (typeof RUNTIME_DIAGNOSTIC_CAPABILITIES)[number];

export type RuntimeDiagnosticArchitecture = {
  id: RuntimeDiagnosticCapabilityId;
  title: string;
  mutationAllowed: false;
  notes: string;
};

export const RUNTIME_DIAGNOSTICS_ARCHITECTURE: readonly RuntimeDiagnosticArchitecture[] =
  [
    { id: "job_failures", title: "Job Failures", mutationAllowed: false, notes: "Observe failures only." },
    { id: "worker_failures", title: "Worker Failures", mutationAllowed: false, notes: "Observe failures only." },
    { id: "queue_health", title: "Queue Health", mutationAllowed: false, notes: "Health signals only." },
    { id: "event_failures", title: "Event Failures", mutationAllowed: false, notes: "Infrastructure failures — not business payloads." },
    { id: "retry_analysis", title: "Retry Analysis", mutationAllowed: false, notes: "Analysis only." },
    { id: "dead_letter_analysis", title: "Dead Letter Analysis", mutationAllowed: false, notes: "Analysis only." },
    { id: "execution_timeline", title: "Execution Timeline", mutationAllowed: false, notes: "Canonical timeline presentation." },
    { id: "failure_correlation", title: "Failure Correlation", mutationAllowed: false, notes: "Correlate infrastructure failures." },
    { id: "root_cause_analysis", title: "Root Cause Analysis", mutationAllowed: false, notes: "Assist operators — no auto-mutation." },
    { id: "runtime_history", title: "Runtime History", mutationAllowed: false, notes: "Historical execution metadata." },
  ] as const;
