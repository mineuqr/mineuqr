/**
 * REPORTING-BUSINESS-DAY-BACKFILL-1
 *
 * Rebuilds persisted Order Read daily rollups (P-06 / P-10) with canonical
 * Business Day dayKeys. Does not rematerialize order rows or change formulas.
 *
 * Idempotent · restart-safe · tenant-scoped · logs progress/failures.
 */

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { orderReadBackfillRuns } from "../../../../../drizzle/schema";
import { opsLog } from "../../../../_core/opsLog";
import { OPS_EVENT } from "../../../../_core/opsTaxonomy";
import type { OrderReadContextLoader } from "../persistence/OrderReadContextLoader";
import type { OrderReadProjectionMaterializer } from "../../projections/materializers/OrderReadProjectionMaterializer";

export type BusinessDayRollupBackfillScope = "full" | "tenant";

export type BusinessDayRollupBackfillRequest = {
  scope: BusinessDayRollupBackfillScope;
  restaurantId?: number;
};

export type BusinessDayRollupBackfillRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export type BusinessDayRollupBackfillRunRecord = {
  id: string;
  scope: BusinessDayRollupBackfillScope;
  restaurantId: number | null;
  status: BusinessDayRollupBackfillRunStatus;
  restaurantsProcessed: number;
  ordersScanned: number;
  dayKeysWritten: number;
  attemptCount: number;
  lastError: string | null;
};

const RUN_KIND = "business_day_rollup";

export class OrderReadBusinessDayRollupBackfillService {
  constructor(
    private readonly contextLoader: OrderReadContextLoader,
    private readonly materializer: OrderReadProjectionMaterializer
  ) {}

  async run(
    request: BusinessDayRollupBackfillRequest
  ): Promise<BusinessDayRollupBackfillRunRecord> {
    const runId = randomUUID();
    const run: BusinessDayRollupBackfillRunRecord = {
      id: runId,
      scope: request.scope,
      restaurantId: request.restaurantId ?? null,
      status: "running",
      restaurantsProcessed: 0,
      ordersScanned: 0,
      dayKeysWritten: 0,
      attemptCount: 1,
      lastError: null,
    };

    await this.persistRun(run);
    opsLog({
      type: OPS_EVENT.order_read_backfill_started,
      category: "ORDER",
      severity: "info",
      ts: new Date().toISOString(),
      restaurantId: request.restaurantId,
      metadata: { runId, scope: request.scope, kind: RUN_KIND },
    });

    try {
      const restaurantIds = await this.resolveRestaurantIds(request);
      for (const restaurantId of restaurantIds) {
        const result =
          await this.materializer.rebuildRollupsForRestaurant(restaurantId);
        run.restaurantsProcessed += 1;
        run.ordersScanned += result.ordersScanned;
        run.dayKeysWritten += result.dayKeysWritten;

        opsLog({
          type: OPS_EVENT.order_read_backfill_completed,
          category: "ORDER",
          severity: "info",
          ts: new Date().toISOString(),
          restaurantId,
          metadata: {
            runId,
            kind: RUN_KIND,
            phase: "tenant",
            ordersScanned: result.ordersScanned,
            dayKeysWritten: result.dayKeysWritten,
          },
        });
      }

      run.status = "completed";
      await this.persistRun(run);
      opsLog({
        type: OPS_EVENT.order_read_backfill_completed,
        category: "ORDER",
        severity: "info",
        ts: new Date().toISOString(),
        restaurantId: request.restaurantId,
        metadata: {
          runId,
          kind: RUN_KIND,
          restaurantsProcessed: run.restaurantsProcessed,
          ordersScanned: run.ordersScanned,
          dayKeysWritten: run.dayKeysWritten,
        },
      });
      return run;
    } catch (error) {
      run.status = "failed";
      run.lastError = error instanceof Error ? error.message : String(error);
      await this.persistRun(run);
      opsLog({
        type: OPS_EVENT.order_read_backfill_failed,
        category: "ORDER",
        severity: "warn",
        ts: new Date().toISOString(),
        restaurantId: request.restaurantId,
        metadata: { runId, kind: RUN_KIND, error: run.lastError },
      });
      throw error;
    }
  }

  /** Safe retry — increments attemptCount and re-runs same scope. */
  async retry(
    runId: string,
    request: BusinessDayRollupBackfillRequest
  ): Promise<BusinessDayRollupBackfillRunRecord> {
    const previous = await this.getRun(runId);
    const attemptCount = (previous?.attemptCount ?? 0) + 1;
    const result = await this.run(request);
    result.attemptCount = attemptCount;
    await this.persistRun(result);
    return result;
  }

  private async resolveRestaurantIds(
    request: BusinessDayRollupBackfillRequest
  ): Promise<number[]> {
    if (request.scope === "tenant") {
      if (request.restaurantId == null) {
        throw new Error("restaurantId required for tenant scope");
      }
      return [request.restaurantId];
    }
    return this.contextLoader.listRestaurantIds();
  }

  private async persistRun(
    run: BusinessDayRollupBackfillRunRecord
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const summary =
      run.status === "completed"
        ? `[${RUN_KIND}] restaurants=${run.restaurantsProcessed} dayKeys=${run.dayKeysWritten}`
        : run.lastError
          ? `[${RUN_KIND}] ${run.lastError}`
          : null;
    await db
      .insert(orderReadBackfillRuns)
      .values({
        id: run.id,
        scope: run.scope,
        restaurantId: run.restaurantId,
        fromDayKey: null,
        toDayKey: null,
        status: run.status,
        rowsProcessed: run.ordersScanned,
        attemptCount: run.attemptCount,
        lastError: summary,
        startedAt: now,
        completedAt:
          run.status === "completed" || run.status === "failed" ? now : null,
        createdAt: now,
      })
      .onDuplicateKeyUpdate({
        set: {
          status: run.status,
          rowsProcessed: run.ordersScanned,
          attemptCount: run.attemptCount,
          lastError: summary,
          completedAt:
            run.status === "completed" || run.status === "failed" ? now : null,
        },
      });
  }

  private async getRun(
    runId: string
  ): Promise<BusinessDayRollupBackfillRunRecord | null> {
    const db = await getDb();
    if (!db) return null;
    const [row] = await db
      .select()
      .from(orderReadBackfillRuns)
      .where(and(eq(orderReadBackfillRuns.id, runId)))
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      scope: row.scope === "partial" ? "full" : row.scope,
      restaurantId: row.restaurantId,
      status: row.status,
      restaurantsProcessed: 0,
      ordersScanned: row.rowsProcessed,
      dayKeysWritten: 0,
      attemptCount: row.attemptCount,
      lastError: row.lastError,
    };
  }
}
