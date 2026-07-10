import { and, eq, or, sql } from "drizzle-orm";
import { orders } from "../../../../drizzle/schema";
import {
  resolveBusinessDayKey,
  resolveBusinessDayWindow,
} from "../../../../shared/utils/businessDay";
import type { BusinessIdentityAssignment } from "../types";
import type { RestaurantOpeningTimeResolver } from "./RestaurantOpeningTimeResolver";
import type { BusinessIdentityMetrics } from "../observability/BusinessIdentityMetrics";
import { businessIdentityMetrics } from "../observability/BusinessIdentityMetrics";
import {
  logBusinessIdentityAssignmentCompleted,
  logBusinessIdentityAssignmentStarted,
  type BusinessIdentityLogContext,
} from "../observability/businessIdentityObservability";
import { runBusinessIdentityWithRetry } from "./runBusinessIdentityWithRetry";

type DbTx = Parameters<
  Parameters<NonNullable<Awaited<ReturnType<typeof import("../../../db").getDb>>>["transaction"]>[0]
>[0];

export type BusinessIdentityAssignmentContext = {
  correlationId?: string;
  workerId?: string;
};

export class DrizzleBusinessIdentityAllocator {
  constructor(
    private readonly openingTimeResolver: RestaurantOpeningTimeResolver,
    private readonly metrics: BusinessIdentityMetrics = businessIdentityMetrics
  ) {}

  async allocateForNewOrder(
    tx: DbTx,
    input: { orderId: number; restaurantId: number; createdAt: string },
    context?: BusinessIdentityAssignmentContext
  ): Promise<BusinessIdentityAssignment> {
    const startedAt = Date.now();
    const logCtx: BusinessIdentityLogContext = {
      restaurantId: input.restaurantId,
      orderId: input.orderId,
      correlationId: context?.correlationId,
      workerId: context?.workerId,
      path: "hot",
    };

    logBusinessIdentityAssignmentStarted(logCtx);

    const workingHours = await this.openingTimeResolver.getWorkingHours(input.restaurantId);
    const businessDay = resolveBusinessDayKey(input.createdAt, workingHours);

    await tx.execute(sql`
      INSERT INTO order_business_day_sequences (restaurant_id, business_day, last_number)
      VALUES (${input.restaurantId}, ${businessDay}, LAST_INSERT_ID(1))
      ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1)
    `);

    const [seqRow] = await tx.execute(sql`SELECT LAST_INSERT_ID() AS n`);
    const dailyDisplayNumber = Number((seqRow as { n: number }[])[0]?.n ?? 1);

    await tx
      .update(orders)
      .set({
        businessDay,
        dailyDisplayNumber,
      })
      .where(eq(orders.id, input.orderId));

    const durationMs = Date.now() - startedAt;
    this.metrics.recordAssignment(durationMs, "hot");
    logBusinessIdentityAssignmentCompleted({
      ...logCtx,
      businessDay,
      dailyDisplayNumber,
      durationMs,
    });

    return { businessDay, dailyDisplayNumber };
  }

  /**
   * Idempotent assignment for historic orders and projection replay.
   * Uses chronological rank within the business-day window.
   * Concurrency-safe via consistent lock ordering, row locks, and bounded retry.
   */
  async ensureAssigned(
    orderId: number,
    restaurantId: number,
    createdAt: string,
    context?: BusinessIdentityAssignmentContext
  ): Promise<BusinessIdentityAssignment> {
    const db = await import("../../../db").then((m) => m.getDb());
    if (!db) {
      return { businessDay: "", dailyDisplayNumber: 0 };
    }

    const logCtx: BusinessIdentityLogContext = {
      restaurantId,
      orderId,
      correlationId: context?.correlationId,
      workerId: context?.workerId,
      path: "historic",
    };

    return runBusinessIdentityWithRetry(
      async (attempt) => {
        logBusinessIdentityAssignmentStarted({ ...logCtx, attempt });
        const startedAt = Date.now();

        const result = await db.transaction(async (tx) =>
          this.ensureAssignedInTransaction(tx, orderId, restaurantId, createdAt)
        );

        const durationMs = Date.now() - startedAt;
        this.metrics.recordAssignment(durationMs, "historic");
        logBusinessIdentityAssignmentCompleted({
          ...logCtx,
          attempt,
          businessDay: result.businessDay,
          dailyDisplayNumber: result.dailyDisplayNumber,
          durationMs,
        });

        return result;
      },
      logCtx,
      this.metrics
    );
  }

  private async ensureAssignedInTransaction(
    tx: DbTx,
    orderId: number,
    restaurantId: number,
    createdAt: string
  ): Promise<BusinessIdentityAssignment> {
    const workingHours = await this.openingTimeResolver.getWorkingHours(restaurantId);
    const businessDay = resolveBusinessDayKey(createdAt, workingHours);
    const window = resolveBusinessDayWindow(businessDay, workingHours);

    await tx.execute(sql`
      INSERT INTO order_business_day_sequences (restaurant_id, business_day, last_number)
      VALUES (${restaurantId}, ${businessDay}, 0)
      ON DUPLICATE KEY UPDATE last_number = last_number
    `);

    await tx.execute(sql`
      SELECT last_number
      FROM order_business_day_sequences
      WHERE restaurant_id = ${restaurantId}
        AND business_day = ${businessDay}
      FOR UPDATE
    `);

    const [order] = await tx
      .select({
        id: orders.id,
        businessDay: orders.businessDay,
        dailyDisplayNumber: orders.dailyDisplayNumber,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1)
      .for("update");

    if (!order) {
      return { businessDay: "", dailyDisplayNumber: 0 };
    }

    if (order.businessDay && order.dailyDisplayNumber != null) {
      return {
        businessDay: order.businessDay,
        dailyDisplayNumber: order.dailyDisplayNumber,
      };
    }

    const [prior] = await tx
      .select({ count: sql<number>`COUNT(*)` })
      .from(orders)
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          sql`${orders.createdAt} >= ${window.startIso}`,
          sql`${orders.createdAt} < ${window.endIso}`,
          or(
            sql`${orders.createdAt} < ${createdAt}`,
            and(eq(orders.createdAt, createdAt), sql`${orders.id} < ${orderId}`)
          )
        )
      );

    const dailyDisplayNumber = Number(prior?.count ?? 0) + 1;

    await tx.execute(sql`
      INSERT INTO order_business_day_sequences (restaurant_id, business_day, last_number)
      VALUES (${restaurantId}, ${businessDay}, ${dailyDisplayNumber})
      ON DUPLICATE KEY UPDATE last_number = GREATEST(last_number, ${dailyDisplayNumber})
    `);

    await tx
      .update(orders)
      .set({ businessDay, dailyDisplayNumber })
      .where(eq(orders.id, orderId));

    return { businessDay, dailyDisplayNumber };
  }
}
