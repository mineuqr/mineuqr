import { z } from "zod";
import { verifiedProcedure, router } from "../../_core/trpc";
import { assertRestaurantAccess } from "../../restaurantAccess";
import { kitchenReadService } from "./services/KitchenReadService";

const getQueueInput = z.object({
  restaurantId: z.coerce.number().int().positive(),
  status: z.enum(["pending", "preparing", "ready", "all"]).optional(),
  limit: z.number().int().positive().max(200).optional(),
});

/**
 * KITCHEN-DISPLAY-1 read contracts (Q-20 kitchen.read.getQueue).
 */
export const kitchenRouter = router({
  read: router({
    getQueue: verifiedProcedure.input(getQueueInput).query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "kitchen.read.getQueue");
      return kitchenReadService.getQueue(input);
    }),
  }),
});
