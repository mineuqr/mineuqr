/**
 * ORDER-READ-BACKFILL-1 — category backfill observability.
 */
export type CategoryBackfillMetricsSnapshot = {
  rowsPerSecond: number;
  batchCount: number;
  averageBatchDurationMs: number;
  failureCount: number;
  retryCount: number;
  completionPercentage: number;
};

export class OrderReadCategoryBackfillMetrics {
  private batchCount = 0;
  private totalBatchDurationMs = 0;
  private failureCount = 0;
  private retryCount = 0;
  private rowsMigrated = 0;
  private startedAt: number | null = null;

  start(): void {
    this.startedAt = Date.now();
  }

  recordBatch(durationMs: number, migratedInBatch: number): void {
    this.batchCount += 1;
    this.totalBatchDurationMs += durationMs;
    this.rowsMigrated += migratedInBatch;
  }

  recordFailure(): void {
    this.failureCount += 1;
  }

  recordRetry(): void {
    this.retryCount += 1;
  }

  snapshot(input: {
    rowsScanned: number;
    rowsMigrated: number;
    rowsSkipped: number;
    totalRows: number;
    durationMs: number;
  }): CategoryBackfillMetricsSnapshot {
    const rowsPerSecond =
      input.durationMs > 0 ? (input.rowsScanned / input.durationMs) * 1000 : 0;
    const completionPercentage =
      input.totalRows > 0
        ? ((input.rowsMigrated + input.rowsSkipped) / input.totalRows) * 100
        : 100;

    return {
      rowsPerSecond,
      batchCount: this.batchCount,
      averageBatchDurationMs:
        this.batchCount > 0 ? this.totalBatchDurationMs / this.batchCount : 0,
      failureCount: this.failureCount,
      retryCount: this.retryCount,
      completionPercentage,
    };
  }

  reset(): void {
    this.batchCount = 0;
    this.totalBatchDurationMs = 0;
    this.failureCount = 0;
    this.retryCount = 0;
    this.rowsMigrated = 0;
    this.startedAt = null;
  }
}

export const orderReadCategoryBackfillMetrics = new OrderReadCategoryBackfillMetrics();
