import { describe, expect, it, beforeEach } from "vitest";
import { BusinessIdentityMetrics } from "../BusinessIdentityMetrics";

describe("BusinessIdentityMetrics", () => {
  let metrics: BusinessIdentityMetrics;

  beforeEach(() => {
    metrics = new BusinessIdentityMetrics();
  });

  it("tracks assignment, retry, deadlock, and failure counters", () => {
    metrics.recordAssignment(40, "hot");
    metrics.recordAssignment(60, "historic");
    metrics.recordRetry();
    metrics.recordDeadlock();
    metrics.recordUniqueConstraintRetry();
    metrics.recordFailure();

    const snapshot = metrics.snapshot();
    expect(snapshot.assignments).toBe(2);
    expect(snapshot.historicAssignments).toBe(1);
    expect(snapshot.retries).toBe(1);
    expect(snapshot.deadlocks).toBe(1);
    expect(snapshot.uniqueConstraintRetries).toBe(1);
    expect(snapshot.failures).toBe(1);
    expect(snapshot.totalAssignmentDurationMs).toBe(100);
    expect(snapshot.averageAssignmentDurationMs).toBe(50);
  });

  it("resets counters", () => {
    metrics.recordAssignment(10, "hot");
    metrics.reset();
    expect(metrics.snapshot().assignments).toBe(0);
  });
});
