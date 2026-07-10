/**
 * Business Identity operational metrics — integrates with opsLog (MineuQR observability).
 * ORDER-BUSINESS-IDENTITY-HARDENING-1
 */
export type BusinessIdentityMetricsSnapshot = {
  assignments: number;
  retries: number;
  deadlocks: number;
  uniqueConstraintRetries: number;
  historicAssignments: number;
  failures: number;
  totalAssignmentDurationMs: number;
  averageAssignmentDurationMs: number;
};

export class BusinessIdentityMetrics {
  private assignments = 0;
  private retries = 0;
  private deadlocks = 0;
  private uniqueConstraintRetries = 0;
  private historicAssignments = 0;
  private failures = 0;
  private totalAssignmentDurationMs = 0;

  recordAssignment(durationMs: number, path: "hot" | "historic"): void {
    this.assignments += 1;
    this.totalAssignmentDurationMs += durationMs;
    if (path === "historic") {
      this.historicAssignments += 1;
    }
  }

  recordRetry(): void {
    this.retries += 1;
  }

  recordDeadlock(): void {
    this.deadlocks += 1;
  }

  recordUniqueConstraintRetry(): void {
    this.uniqueConstraintRetries += 1;
  }

  recordFailure(): void {
    this.failures += 1;
  }

  snapshot(): BusinessIdentityMetricsSnapshot {
    return {
      assignments: this.assignments,
      retries: this.retries,
      deadlocks: this.deadlocks,
      uniqueConstraintRetries: this.uniqueConstraintRetries,
      historicAssignments: this.historicAssignments,
      failures: this.failures,
      totalAssignmentDurationMs: this.totalAssignmentDurationMs,
      averageAssignmentDurationMs:
        this.assignments > 0 ? this.totalAssignmentDurationMs / this.assignments : 0,
    };
  }

  reset(): void {
    this.assignments = 0;
    this.retries = 0;
    this.deadlocks = 0;
    this.uniqueConstraintRetries = 0;
    this.historicAssignments = 0;
    this.failures = 0;
    this.totalAssignmentDurationMs = 0;
  }
}

export const businessIdentityMetrics = new BusinessIdentityMetrics();

/** Metric names for external observability integrations. */
export const BUSINESS_IDENTITY_METRIC_NAMES = {
  assignments: "BusinessIdentityAssignments",
  retries: "BusinessIdentityRetries",
  deadlocks: "BusinessIdentityDeadlocks",
  uniqueConstraintRetries: "BusinessIdentityUniqueConstraintRetries",
  historicAssignments: "BusinessIdentityHistoricAssignments",
  assignmentDurationMs: "BusinessIdentityAssignmentDuration",
  failures: "BusinessIdentityFailures",
} as const;
