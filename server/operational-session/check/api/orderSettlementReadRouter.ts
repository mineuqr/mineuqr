/**
 * ORDER-SETTLEMENT-API-1 — read-only tRPC exposure of Order Settlement Projection.
 *
 * Authorization + validation + DTO serialization only.
 * No commands, Domain, Aggregate, Repository, or money math.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { verifiedProcedure, router } from "../../../_core/trpc";
import { assertRestaurantAccess } from "../../../restaurantAccess";
import { runOrderSettlementRead } from "./mapOrderSettlementApiError";
import { orderSettlementReadService } from "./orderSettlementReadComposition";

const restaurantInput = z.object({
  restaurantId: z.coerce.number().int().positive(),
});

const checkInput = restaurantInput.extend({
  checkId: z.coerce.number().int().positive(),
});

const orderOnCheckInput = checkInput.extend({
  orderId: z.coerce.number().int().positive(),
});

const orderInput = restaurantInput.extend({
  orderId: z.coerce.number().int().positive(),
});

/**
 * Canonical read endpoints:
 * - getByOrder (identity on Check)
 * - listByOrder
 * - listByCheck / getByCheck (list)
 * - listByRestaurant
 * - getSummaryByCheck
 * - getProjectionMetadata
 */
export const orderSettlementReadRouter = router({
  getByOrder: verifiedProcedure
    .input(orderOnCheckInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "orderSettlement.getByOrder"
      );
      return runOrderSettlementRead(async () => {
        const dto = await orderSettlementReadService.getByOrder(input);
        if (!dto) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order Settlement not found",
          });
        }
        return dto;
      });
    }),

  listByOrder: verifiedProcedure
    .input(orderInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "orderSettlement.listByOrder"
      );
      return runOrderSettlementRead(() =>
        orderSettlementReadService.listByOrder(input)
      );
    }),

  listByCheck: verifiedProcedure
    .input(checkInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "orderSettlement.listByCheck"
      );
      return runOrderSettlementRead(() =>
        orderSettlementReadService.listByCheck(input)
      );
    }),

  /** Alias for list-by-check settlement retrieval. */
  getByCheck: verifiedProcedure
    .input(checkInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "orderSettlement.getByCheck"
      );
      return runOrderSettlementRead(() =>
        orderSettlementReadService.listByCheck(input)
      );
    }),

  listByRestaurant: verifiedProcedure
    .input(restaurantInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "orderSettlement.listByRestaurant"
      );
      return runOrderSettlementRead(() =>
        orderSettlementReadService.listByRestaurant(input)
      );
    }),

  getSummaryByCheck: verifiedProcedure
    .input(checkInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "orderSettlement.getSummaryByCheck"
      );
      return runOrderSettlementRead(() =>
        orderSettlementReadService.getSummaryByCheck(input)
      );
    }),

  getProjectionMetadata: verifiedProcedure
    .input(restaurantInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "orderSettlement.getProjectionMetadata"
      );
      // Catalog is constant; restaurantId enforces tenant gate only.
      return orderSettlementReadService.getProjectionCatalog();
    }),
});
