/**
 * THERMAL-PRINTING-13I.6 — diagnostic test print wire identifiers.
 *
 * Diagnostic runs use synthetic wire job IDs so agents can reuse the existing
 * JOB_ASSIGNED → fetch → execute path without creating customer print_jobs rows.
 */
export const DIAGNOSTIC_WIRE_JOB_ID_BASE = 9_000_000_000;

export function isDiagnosticWireJobId(jobId: number): boolean {
  return Number.isInteger(jobId) && jobId >= DIAGNOSTIC_WIRE_JOB_ID_BASE;
}

export function diagnosticRunIdFromWireJobId(jobId: number): number {
  return jobId - DIAGNOSTIC_WIRE_JOB_ID_BASE;
}

export function diagnosticWireJobIdFromRunId(runId: number): number {
  if (!Number.isInteger(runId) || runId <= 0) {
    throw new Error("Invalid diagnostic run id");
  }
  return DIAGNOSTIC_WIRE_JOB_ID_BASE + runId;
}

/**
 * Positive sentinel orderId for diagnostic agent payloads.
 * Uses the diagnostic wire job id so customer orderId validation passes unchanged.
 */
export function diagnosticOrderIdForWireJob(wireJobId: number): number {
  if (!isDiagnosticWireJobId(wireJobId)) {
    throw new Error("Invalid diagnostic wire job id");
  }
  return wireJobId;
}

export const DIAGNOSTIC_PRINT_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type DiagnosticPrintStatus =
  (typeof DIAGNOSTIC_PRINT_STATUS)[keyof typeof DIAGNOSTIC_PRINT_STATUS];
