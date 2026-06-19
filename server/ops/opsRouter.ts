import { z } from "zod";
import { verifiedProcedure, router } from "../_core/trpc";
import { assertRestaurantAccess } from "../restaurantAccess";
import { getRestaurantOverview } from "./restaurantOverview";

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
});
