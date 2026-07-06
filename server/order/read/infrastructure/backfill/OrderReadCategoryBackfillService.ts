import { randomUUID } from "node:crypto";
import { opsLog } from "../../../../_core/opsLog";
import { OPS_EVENT } from "../../../../_core/opsTaxonomy";
import {
  ORDER_CATEGORY_PROJECTION_SCHEMA_VERSION,
  type OrderCategoryProjection,
} from "../../domain/contracts/categoryProjectionContracts";
import { ORDER_READ_PROJECTION_SCHEMA_VERSION } from "../../domain/contracts/projectionIds";
import { OrderCategoryProjectionBuilder } from "../../projections/builders/OrderCategoryProjectionBuilder";
import {
  assertCanonicalCategoryProjection,
  isUpgradedCategoryProjection,
} from "../persistence/categoryProjectionValidation";
import type {
  CategoryBackfillLineItemCursor,
  CategoryBackfillLineItemRow,
  CategoryBackfillLineItemStore,
} from "./CategoryBackfillLineItemStore";
import {
  OrderReadCategoryBackfillMetrics,
  orderReadCategoryBackfillMetrics,
} from "./OrderReadCategoryBackfillMetrics";

export const CATEGORY_BACKFILL_DEFAULT_BATCH_SIZE = 500 as const;

export type CategoryBackfillScope = "full" | "tenant";

export type CategoryBackfillRequest = {
  scope: CategoryBackfillScope;
  restaurantId?: number;
  batchSize?: number;
  resumeAfter?: CategoryBackfillLineItemCursor;
};

export type CategoryBackfillFailure = {
  restaurantId: number;
  orderId: number;
  lineItemId: number;
  menuItemId: number;
  error: string;
};

export type CategoryBackfillReport = {
  runId: string;
  status: "completed" | "failed" | "partial";
  rowsScanned: number;
  rowsMigrated: number;
  rowsSkipped: number;
  rowsFailed: number;
  durationMs: number;
  projectionSchemaVersion: typeof ORDER_READ_PROJECTION_SCHEMA_VERSION;
  categoryProjectionSchemaVersion: typeof ORDER_CATEGORY_PROJECTION_SCHEMA_VERSION;
  integrityStatus: "valid" | "invalid" | "pending";
  failures: CategoryBackfillFailure[];
  observability: {
    rowsPerSecond: number;
    batchCount: number;
    averageBatchDurationMs: number;
    failureCount: number;
    retryCount: number;
    completionPercentage: number;
  };
  resumeCursor: CategoryBackfillLineItemCursor | null;
};

/**
 * ORDER-READ-BACKFILL-1 — upgrades legacy order_read_order_line_items rows
 * with canonical OrderCategoryProjection values.
 */
export class OrderReadCategoryBackfillService {
  constructor(
    private readonly store: CategoryBackfillLineItemStore,
    private readonly categoryBuilder: OrderCategoryProjectionBuilder,
    private readonly metrics: OrderReadCategoryBackfillMetrics = orderReadCategoryBackfillMetrics
  ) {}

  async run(request: CategoryBackfillRequest): Promise<CategoryBackfillReport> {
    const runId = randomUUID();
    const started = Date.now();
    const batchSize = request.batchSize ?? CATEGORY_BACKFILL_DEFAULT_BATCH_SIZE;
    const restaurantId = request.scope === "tenant" ? request.restaurantId : undefined;

    if (request.scope === "tenant" && restaurantId == null) {
      throw new Error("restaurantId required for tenant category backfill");
    }

    this.metrics.reset();
    this.metrics.start();

    opsLog({
      type: OPS_EVENT.order_read_category_backfill_started,
      category: "ORDER",
      severity: "info",
      ts: new Date().toISOString(),
      restaurantId,
      metadata: { runId, scope: request.scope, batchSize },
    });

    const counts = await this.store.countRows(restaurantId);
    const failures: CategoryBackfillFailure[] = [];
    let rowsScanned = 0;
    let rowsMigrated = 0;
    let rowsSkipped = 0;
    let rowsFailed = 0;
    let resumeCursor: CategoryBackfillLineItemCursor | null = request.resumeAfter ?? null;
    let status: CategoryBackfillReport["status"] = "completed";

    try {
      while (true) {
        const batch = await this.store.listLegacyBatch({
          batchSize,
          restaurantId,
          resumeAfter: resumeCursor ?? undefined,
        });

        if (batch.length === 0) break;

        const batchStarted = Date.now();
        let migratedInBatch = 0;

        const { migrated, skipped, failed, batchFailures } = await this.processBatch(batch);
        rowsScanned += batch.length;
        rowsMigrated += migrated;
        rowsSkipped += skipped;
        rowsFailed += failed;
        migratedInBatch = migrated;
        failures.push(...batchFailures);

        const lastRow = batch[batch.length - 1];
        if (lastRow) {
          resumeCursor = {
            restaurantId: lastRow.restaurantId,
            orderId: lastRow.orderId,
            lineItemId: lastRow.lineItemId,
          };
        }

        this.metrics.recordBatch(Date.now() - batchStarted, migratedInBatch);

        if (batch.length < batchSize) break;
      }

      const verification = await this.verify(restaurantId);
      const integrityStatus = verification.ok ? "valid" : "invalid";
      if (!verification.ok) {
        status = failures.length > 0 ? "partial" : "failed";
      }

      const durationMs = Date.now() - started;
      const report: CategoryBackfillReport = {
        runId,
        status,
        rowsScanned,
        rowsMigrated,
        rowsSkipped,
        rowsFailed,
        durationMs,
        projectionSchemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
        categoryProjectionSchemaVersion: ORDER_CATEGORY_PROJECTION_SCHEMA_VERSION,
        integrityStatus,
        failures,
        observability: this.metrics.snapshot({
          rowsScanned,
          rowsMigrated,
          rowsSkipped,
          totalRows: counts.totalRows,
          durationMs,
        }),
        resumeCursor: verification.ok ? null : resumeCursor,
      };

      opsLog({
        type: OPS_EVENT.order_read_category_backfill_completed,
        category: "ORDER",
        severity: integrityStatus === "valid" ? "info" : "warn",
        ts: new Date().toISOString(),
        restaurantId,
        metadata: {
          runId,
          rowsMigrated,
          rowsFailed,
          integrityStatus,
        },
      });

      return report;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      opsLog({
        type: OPS_EVENT.order_read_category_backfill_failed,
        category: "ORDER",
        severity: "warn",
        ts: new Date().toISOString(),
        restaurantId,
        metadata: { runId, error: message },
      });
      throw error;
    }
  }

  async retry(
    request: CategoryBackfillRequest
  ): Promise<CategoryBackfillReport> {
    this.metrics.recordRetry();
    return this.run(request);
  }

  private async processBatch(batch: CategoryBackfillLineItemRow[]): Promise<{
    migrated: number;
    skipped: number;
    failed: number;
    batchFailures: CategoryBackfillFailure[];
  }> {
    const pending: CategoryBackfillLineItemRow[] = [];
    let skipped = 0;

    for (const row of batch) {
      if (isUpgradedCategoryProjection(row.categoryProjection, row.lineItemId)) {
        skipped += 1;
        continue;
      }
      pending.push(row);
    }

    if (pending.length === 0) {
      return { migrated: 0, skipped, failed: 0, batchFailures: [] };
    }

    const byRestaurant = new Map<number, CategoryBackfillLineItemRow[]>();
    for (const row of pending) {
      const list = byRestaurant.get(row.restaurantId) ?? [];
      list.push(row);
      byRestaurant.set(row.restaurantId, list);
    }

    const updates: Array<{
      restaurantId: number;
      orderId: number;
      lineItemId: number;
      categoryProjection: OrderCategoryProjection;
    }> = [];
    const batchFailures: CategoryBackfillFailure[] = [];

    for (const [restaurantId, rows] of Array.from(byRestaurant.entries())) {
      const projections = await this.categoryBuilder.buildCategoryProjectionsForMenuItems(
        restaurantId,
        rows.map((row: CategoryBackfillLineItemRow) => row.menuItemId)
      );

      for (const row of rows) {
        const projection = projections.get(row.menuItemId);
        if (!projection) {
          this.metrics.recordFailure();
          batchFailures.push({
            restaurantId: row.restaurantId,
            orderId: row.orderId,
            lineItemId: row.lineItemId,
            menuItemId: row.menuItemId,
            error: "category_resolution_failed",
          });
          continue;
        }

        try {
          assertCanonicalCategoryProjection(projection, row.lineItemId);
          updates.push({
            restaurantId: row.restaurantId,
            orderId: row.orderId,
            lineItemId: row.lineItemId,
            categoryProjection: projection,
          });
        } catch (error) {
          this.metrics.recordFailure();
          batchFailures.push({
            restaurantId: row.restaurantId,
            orderId: row.orderId,
            lineItemId: row.lineItemId,
            menuItemId: row.menuItemId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    if (updates.length > 0) {
      await this.store.updateCategoryProjections(updates);
    }

    return {
      migrated: updates.length,
      skipped,
      failed: batchFailures.length,
      batchFailures,
    };
  }

  async verify(restaurantId?: number): Promise<{
    ok: boolean;
    totalRows: number;
    legacyRows: number;
    integrityPercentage: number;
  }> {
    const counts = await this.store.countRows(restaurantId);
    const integrityPercentage =
      counts.totalRows > 0
        ? ((counts.totalRows - counts.legacyRows) / counts.totalRows) * 100
        : 100;

    return {
      ok: counts.legacyRows === 0,
      totalRows: counts.totalRows,
      legacyRows: counts.legacyRows,
      integrityPercentage,
    };
  }
}
