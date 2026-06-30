import { z } from "zod";
import { verifiedProcedure, router } from "../_core/trpc";
import { assertRestaurantAccess } from "../restaurantAccess";
import { printWorkspaceReadService } from "./read/services/PrintWorkspaceReadService";

const listOrdersInput = z.object({
  restaurantId: z.coerce.number().int().positive(),
  view: z.enum(["awaiting", "completed", "all"]).optional(),
  status: z.enum(["pending", "preparing", "ready", "served", "cancelled"]).optional(),
  search: z.string().max(128).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  cursor: z.string().nullable().optional(),
});

const orderDetailInput = z.object({
  restaurantId: z.coerce.number().int().positive(),
  orderId: z.coerce.number().int().positive(),
});

/**
 * PRINT-WORKSPACE-1 — operational read API (projection-backed only).
 */
export const printWorkspaceRouter = router({
  read: router({
    listOrders: verifiedProcedure.input(listOrdersInput).query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printWorkspace.read.listOrders");
      return printWorkspaceReadService.listOrders(input);
    }),

    getOrderDetail: verifiedProcedure.input(orderDetailInput).query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printWorkspace.read.getOrderDetail");
      return printWorkspaceReadService.getOrderDetail(input);
    }),
  }),
});
