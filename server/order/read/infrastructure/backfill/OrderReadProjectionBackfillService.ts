import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { orderReadBackfillRuns } from "../../../../../drizzle/schema";
import { opsLog } from "../../../../_core/opsLog";
import { OPS_EVENT } from "../../../../_core/opsTaxonomy";
import type { OrderReadContextLoader } from "../persistence/OrderReadContextLoader";
import { DrizzleOrderReadProjectionStore } from "../persistence/drizzle/DrizzleOrderReadProjectionStore";
import type { OrderReadProjectionMaterializer } from "../../projections/materializers/OrderReadProjectionMaterializer";
import { dayKeyFromTimestamp } from "../../projections/materializers/projectionStatus";
import { restaurantOpeningTimeResolver } from "../../../business-identity/infrastructure/RestaurantOpeningTimeResolver";
import type { NormalizedWorkingHours } from "@shared/utils/businessDay";

export type BackfillScope = "full" | "tenant" | "partial";

export type BackfillRequest = {
  scope: BackfillScope;
  restaurantId?: number;
  fromDayKey?: string;
  toDayKey?: string;
};

export type BackfillRunStatus = "pending" | "running" | "completed" | "failed";

export type BackfillRunRecord = {
  id: string;
  scope: BackfillScope;
  restaurantId: number | null;
  fromDayKey: string | null;
  toDayKey: string | null;
  status: BackfillRunStatus;
  rowsProcessed: number;
  attemptCount: number;
  lastError: string | null;
};

export class OrderReadProjectionBackfillService {
  constructor(
    private readonly contextLoader: OrderReadContextLoader,
    private readonly drizzleStore: DrizzleOrderReadProjectionStore,
    private readonly materializer: OrderReadProjectionMaterializer
  ) {}

  async run(request: BackfillRequest): Promise<BackfillRunRecord> {
    const runId = randomUUID();
    const run: BackfillRunRecord = {
      id: runId,
      scope: request.scope,
      restaurantId: request.restaurantId ?? null,
      fromDayKey: request.fromDayKey ?? null,
      toDayKey: request.toDayKey ?? null,
      status: "running",
      rowsProcessed: 0,
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
      metadata: { runId, scope: request.scope },
    });

    try {
      const restaurantIds = await this.resolveRestaurantIds(request);
      for (const restaurantId of restaurantIds) {
        const workingHours =
          await restaurantOpeningTimeResolver.getWorkingHours(restaurantId);
        const orderIds = await this.contextLoader.listOrderIdsForRestaurant(restaurantId);
        for (const orderId of orderIds) {
          const source = await this.contextLoader.loadByOrderId(orderId);
          if (!source) continue;
          if (
            !this.matchesPartialRange(
              source.order.createdAt,
              request,
              workingHours
            )
          ) {
            continue;
          }
          await this.materializer.syncOrderProjections(orderId, runId);
          run.rowsProcessed += 1;
        }
        await this.materializer.rebuildRollupsForRestaurant(restaurantId);
      }

      run.status = "completed";
      await this.persistRun(run);
      opsLog({
        type: OPS_EVENT.order_read_backfill_completed,
        category: "ORDER",
        severity: "info",
        ts: new Date().toISOString(),
        restaurantId: request.restaurantId,
        metadata: { runId, rowsProcessed: run.rowsProcessed },
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
        metadata: { runId, error: run.lastError },
      });
      throw error;
    }
  }

  /** Safe retry — increments attemptCount and re-runs same scope. */
  async retry(runId: string, request: BackfillRequest): Promise<BackfillRunRecord> {
    const previous = await this.getRun(runId);
    const attemptCount = (previous?.attemptCount ?? 0) + 1;
    const result = await this.run(request);
    result.attemptCount = attemptCount;
    await this.persistRun(result);
    return result;
  }

  private async resolveRestaurantIds(request: BackfillRequest): Promise<number[]> {
    if (request.scope === "tenant" || request.scope === "partial") {
      if (request.restaurantId == null) {
        throw new Error("restaurantId required for tenant/partial backfill");
      }
      return [request.restaurantId];
    }
    return this.contextLoader.listRestaurantIds();
  }

  private matchesPartialRange(
    createdAt: string,
    request: BackfillRequest,
    workingHours: NormalizedWorkingHours
  ): boolean {
    if (request.scope !== "partial") return true;
    const dayKey = dayKeyFromTimestamp(createdAt, workingHours);
    if (request.fromDayKey && dayKey < request.fromDayKey) return false;
    if (request.toDayKey && dayKey > request.toDayKey) return false;
    return true;
  }

  private async persistRun(run: BackfillRunRecord): Promise<void> {
    const db = await getDb();
    if (!db) return;
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    await db
      .insert(orderReadBackfillRuns)
      .values({
        id: run.id,
        scope: run.scope,
        restaurantId: run.restaurantId,
        fromDayKey: run.fromDayKey,
        toDayKey: run.toDayKey,
        status: run.status,
        rowsProcessed: run.rowsProcessed,
        attemptCount: run.attemptCount,
        lastError: run.lastError,
        startedAt: run.status === "running" ? now : undefined,
        completedAt: run.status === "completed" || run.status === "failed" ? now : undefined,
      })
      .onDuplicateKeyUpdate({
        set: {
          status: run.status,
          rowsProcessed: run.rowsProcessed,
          attemptCount: run.attemptCount,
          lastError: run.lastError,
          completedAt: run.status === "completed" || run.status === "failed" ? now : undefined,
        },
      });
  }

  async getRun(runId: string): Promise<BackfillRunRecord | null> {
    const db = await getDb();
    if (!db) return null;
    const [row] = await db
      .select()
      .from(orderReadBackfillRuns)
      .where(eq(orderReadBackfillRuns.id, runId))
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      scope: row.scope,
      restaurantId: row.restaurantId ?? null,
      fromDayKey: row.fromDayKey ?? null,
      toDayKey: row.toDayKey ?? null,
      status: row.status,
      rowsProcessed: row.rowsProcessed,
      attemptCount: row.attemptCount,
      lastError: row.lastError ?? null,
    };
  }
}
