import { z } from "zod";
import { verifiedProcedure, router } from "../../_core/trpc";
import { assertRestaurantAccess } from "../../restaurantAccess";
import { orderReadWorkspaceService } from "./services/OrderReadWorkspaceService";

const restaurantInput = z.object({
  restaurantId: z.coerce.number().int().positive(),
});

const listActiveInput = restaurantInput.extend({
  status: z.enum(["pending", "preparing", "ready", "all-active"]).optional(),
  limit: z.number().int().positive().max(100).optional(),
  cursor: z.string().nullable().optional(),
});

const orderDetailInput = restaurantInput.extend({
  orderId: z.coerce.number().int().positive(),
});

/**
 * Q-01 / Q-03 / Q-04 — read-only exposure over order_read_* projections.
 * listActive membership is defined on OrderReadWorkspaceService (active
 * lifecycle on order_read_orders; optional status; cashier_pos extra gate).
 */
export const orderReadRouter = router({
  listActive: verifiedProcedure.input(listActiveInput).query(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "order.read.listActive");
    return orderReadWorkspaceService.listActive(input);
  }),

  getDetail: verifiedProcedure.input(orderDetailInput).query(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "order.read.getDetail");
    return orderReadWorkspaceService.getDetail(input);
  }),

  getTimeline: verifiedProcedure.input(orderDetailInput).query(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "order.read.getTimeline");
    return orderReadWorkspaceService.getTimeline(input);
  }),
});
