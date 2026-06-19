import { z } from "zod";
import { verifiedProcedure, router } from "../_core/trpc";
import { assertRestaurantAccess } from "../restaurantAccess";
import { getRestaurantOverview } from "./restaurantOverview";
import { getActiveTablesBoard } from "./activeTablesBoard";
import { getActionCenter } from "./actionCenter";
import { getActivityFeed } from "./activityFeed";
import { ACTIVITY_FEED_DEFAULT_LIMIT, ACTIVITY_FEED_MAX_LIMIT } from "./operationalConstants";

/**
 * OPS-DASHBOARD-2 — owner restaurant operations read API.
 */
export const opsRouter = router({
  getRestaurantOverview: verifiedProcedure
    .input(
      z.object({
        /** Coerced from number or numeric string at the API boundary. */
        restaurantId: z.coerce.number().int().positive(),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "ops.getRestaurantOverview"
      );
      return getRestaurantOverview(input.restaurantId);
    }),

  getActiveTablesBoard: verifiedProcedure
    .input(z.object({ restaurantId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "ops.getActiveTablesBoard"
      );
      return getActiveTablesBoard(input.restaurantId);
    }),

  getActionCenter: verifiedProcedure
    .input(z.object({ restaurantId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "ops.getActionCenter");
      return getActionCenter(input.restaurantId);
    }),

  getActivityFeed: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number().int().positive(),
        limit: z.number().int().positive().max(ACTIVITY_FEED_MAX_LIMIT).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "ops.getActivityFeed");
      return getActivityFeed(input.restaurantId, {
        limit: input.limit ?? ACTIVITY_FEED_DEFAULT_LIMIT,
      });
    }),
});
