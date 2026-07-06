/**
 * ORDER-READ-CATEGORY-PROJECTION-1 — projection builder observability.
 * Future monitoring consumes these counters.
 */
export type OrderCategoryProjectionMetricsSnapshot = {
  projectionCount: number;
  validationFailures: number;
  totalCategoryResolutionDurationMs: number;
};

export class OrderCategoryProjectionMetrics {
  private projectionCount = 0;
  private validationFailures = 0;
  private totalCategoryResolutionDurationMs = 0;

  recordProjectionBuilt(durationMs: number): void {
    this.projectionCount += 1;
    this.totalCategoryResolutionDurationMs += durationMs;
  }

  recordValidationFailure(): void {
    this.validationFailures += 1;
  }

  snapshot(): OrderCategoryProjectionMetricsSnapshot {
    return {
      projectionCount: this.projectionCount,
      validationFailures: this.validationFailures,
      totalCategoryResolutionDurationMs: this.totalCategoryResolutionDurationMs,
    };
  }

  reset(): void {
    this.projectionCount = 0;
    this.validationFailures = 0;
    this.totalCategoryResolutionDurationMs = 0;
  }
}

export const orderCategoryProjectionMetrics = new OrderCategoryProjectionMetrics();
