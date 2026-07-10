import { and, eq, or, sql } from "drizzle-orm";
import { orders } from "../../../../drizzle/schema";
import {
  resolveBusinessDayKey,
  resolveBusinessDayWindow,
} from "../../../../shared/utils/businessDay";
import type { BusinessIdentityAssignment } from "../types";
import type { RestaurantOpeningTimeResolver } from "./RestaurantOpeningTimeResolver";

type DbTx = Parameters<
  Parameters<NonNullable<Awaited<ReturnType<typeof import("../../../db").getDb>>>["transaction"]>[0]
>[0];

export class DrizzleBusinessIdentityAllocator {
  constructor(private readonly openingTimeResolver: RestaurantOpeningTimeResolver) {}

  async allocateForNewOrder(
    tx: DbTx,
    input: { orderId: number; restaurantId: number; createdAt: string }
  ): Promise<BusinessIdentityAssignment> {
    const workingHours = await this.openingTimeResolver.getWorkingHours(input.restaurantId);
    const businessDay = resolveBusinessDayKey(input.createdAt, workingHours);

    await tx.execute(sql`
      INSERT INTO order_business_day_sequences (restaurant_id, business_day, last_number)
      VALUES (${input.restaurantId}, ${businessDay}, 1)
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

    return { businessDay, dailyDisplayNumber };
  }

  /**
   * Idempotent assignment for historic orders and projection replay.
   * Uses chronological rank within the business-day window.
   */
  async ensureAssigned(
    orderId: number,
    restaurantId: number,
    createdAt: string
  ): Promise<BusinessIdentityAssignment> {
    const db = await import("../../../db").then((m) => m.getDb());
    if (!db) {
      return { businessDay: "", dailyDisplayNumber: 0 };
    }

    return db.transaction(async (tx) => {
      const [order] = await tx
        .select({
          id: orders.id,
          businessDay: orders.businessDay,
          dailyDisplayNumber: orders.dailyDisplayNumber,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        return { businessDay: "", dailyDisplayNumber: 0 };
      }

      if (order.businessDay && order.dailyDisplayNumber != null) {
        return {
          businessDay: order.businessDay,
          dailyDisplayNumber: order.dailyDisplayNumber,
        };
      }

      const workingHours = await this.openingTimeResolver.getWorkingHours(restaurantId);
      const businessDay = resolveBusinessDayKey(createdAt, workingHours);
      const window = resolveBusinessDayWindow(businessDay, workingHours);

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
    });
  }
}
