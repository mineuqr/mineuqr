import { randomUUID } from "node:crypto";
import { opsLog } from "../../../../_core/opsLog";
import { OPS_EVENT } from "../../../../_core/opsTaxonomy";
import { ORDER_OFFER_PROJECTION_SCHEMA_VERSION } from "../../domain/contracts/offerProjectionContracts";
import { ORDER_READ_PROJECTION_SCHEMA_VERSION } from "../../domain/contracts/projectionIds";
import { orderOfferProjectionBuilder } from "../../projections/builders/OrderOfferProjectionBuilder";
import { isUpgradedOfferProjection } from "./DrizzleOfferBackfillLineItemStore";
import type {
  OfferBackfillLineItemCursor,
  OfferBackfillLineItemRow,
  OfferBackfillLineItemStore,
} from "./OfferBackfillLineItemStore";

export const OFFER_BACKFILL_DEFAULT_BATCH_SIZE = 500 as const;

export type OfferBackfillScope = "full" | "tenant";

export type OfferBackfillRequest = {
  scope: OfferBackfillScope;
  restaurantId?: number;
  batchSize?: number;
  resumeAfter?: OfferBackfillLineItemCursor;
};

export type OfferBackfillFailure = {
  restaurantId: number;
  orderId: number;
  lineItemId: number;
  error: string;
};

export type OfferBackfillReport = {
  runId: string;
  status: "completed" | "failed" | "partial";
  rowsScanned: number;
  rowsMigrated: number;
  rowsSkipped: number;
  rowsFailed: number;
  durationMs: number;
  projectionSchemaVersion: typeof ORDER_READ_PROJECTION_SCHEMA_VERSION;
  offerProjectionSchemaVersion: typeof ORDER_OFFER_PROJECTION_SCHEMA_VERSION;
  integrityStatus: "valid" | "invalid" | "pending";
  failures: OfferBackfillFailure[];
  resumeCursor: OfferBackfillLineItemCursor | null;
};

/**
 * ORDER-READ-OFFER-PROJECTION-1 — upgrades historical offer lines (menuItemId = 0)
 * with canonical OrderOfferProjection. Does not fabricate menu/category data.
 */
export class OrderReadOfferBackfillService {
  constructor(private readonly store: OfferBackfillLineItemStore) {}

  async run(request: OfferBackfillRequest): Promise<OfferBackfillReport> {
    const runId = randomUUID();
    const started = Date.now();
    const batchSize = request.batchSize ?? OFFER_BACKFILL_DEFAULT_BATCH_SIZE;
    const restaurantId = request.scope === "tenant" ? request.restaurantId : undefined;

    if (request.scope === "tenant" && restaurantId == null) {
      throw new Error("restaurantId required for tenant offer backfill");
    }

    opsLog({
      type: OPS_EVENT.order_read_backfill_started,
      category: "ORDER",
      severity: "info",
      ts: new Date().toISOString(),
      restaurantId,
      metadata: { runId, scope: request.scope, batchSize },
    });

    const counts = await this.store.countRows(restaurantId);
    const failures: OfferBackfillFailure[] = [];
    let rowsScanned = 0;
    let rowsMigrated = 0;
    let rowsSkipped = 0;
    let resumeCursor: OfferBackfillLineItemCursor | null = request.resumeAfter ?? null;

    while (true) {
      const batch = await this.store.listLegacyBatch({
        batchSize,
        restaurantId,
        resumeAfter: resumeCursor ?? undefined,
      });
      if (batch.length === 0) break;

      rowsScanned += batch.length;
      const result = await this.processBatch(batch);
      rowsMigrated += result.migrated;
      rowsSkipped += result.skipped;
      failures.push(...result.batchFailures);

      const last = batch[batch.length - 1];
      if (last) {
        resumeCursor = {
          restaurantId: last.restaurantId,
          orderId: last.orderId,
          lineItemId: last.lineItemId,
        };
      }

      if (batch.length < batchSize) break;
    }

    const durationMs = Date.now() - started;
    const integrityStatus: OfferBackfillReport["integrityStatus"] =
      failures.length > 0
        ? "invalid"
        : counts.legacyOfferRows - rowsMigrated <= 0
          ? "valid"
          : "pending";

    const report: OfferBackfillReport = {
      runId,
      status: failures.length > 0 ? "partial" : "completed",
      rowsScanned,
      rowsMigrated,
      rowsSkipped,
      rowsFailed: failures.length,
      durationMs,
      projectionSchemaVersion: ORDER_READ_PROJECTION_SCHEMA_VERSION,
      offerProjectionSchemaVersion: ORDER_OFFER_PROJECTION_SCHEMA_VERSION,
      integrityStatus,
      failures,
      resumeCursor,
    };

    opsLog({
      type: OPS_EVENT.order_read_backfill_completed,
      category: "ORDER",
      severity: failures.length > 0 ? "warn" : "info",
      ts: new Date().toISOString(),
      restaurantId,
      metadata: { runId, rowsMigrated, rowsFailed: failures.length },
    });

    return report;
  }

  private async processBatch(batch: OfferBackfillLineItemRow[]): Promise<{
    migrated: number;
    skipped: number;
    failed: number;
    batchFailures: OfferBackfillFailure[];
  }> {
    const updates: Array<{
      restaurantId: number;
      orderId: number;
      lineItemId: number;
      offerProjection: ReturnType<typeof orderOfferProjectionBuilder.buildFromSnapshot>;
    }> = [];
    const batchFailures: OfferBackfillFailure[] = [];
    let skipped = 0;

    for (const row of batch) {
      if (isUpgradedOfferProjection(row.offerProjection, row.lineItemId)) {
        skipped += 1;
        continue;
      }

      try {
        updates.push({
          restaurantId: row.restaurantId,
          orderId: row.orderId,
          lineItemId: row.lineItemId,
          offerProjection: orderOfferProjectionBuilder.buildFromSnapshot({
            titleAr: row.nameAr,
            titleEn: row.nameEn,
            updatedAt: new Date().toISOString(),
          }),
        });
      } catch (error) {
        batchFailures.push({
          restaurantId: row.restaurantId,
          orderId: row.orderId,
          lineItemId: row.lineItemId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (updates.length > 0) {
      await this.store.updateOfferProjections(updates);
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
    totalOfferRows: number;
    legacyOfferRows: number;
    integrityPercentage: number;
  }> {
    const counts = await this.store.countRows(restaurantId);
    const integrityPercentage =
      counts.totalOfferRows > 0
        ? ((counts.totalOfferRows - counts.legacyOfferRows) / counts.totalOfferRows) * 100
        : 100;

    return {
      ok: counts.legacyOfferRows === 0,
      totalOfferRows: counts.totalOfferRows,
      legacyOfferRows: counts.legacyOfferRows,
      integrityPercentage,
    };
  }
}
