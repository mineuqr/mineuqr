/**
 * THERMAL-PRINTING-12E.1B — endpoint operations tRPC router (read-only visibility).
 */
import { z } from "zod";
import { verifiedProcedure, router } from "../_core/trpc";
import { assertRestaurantAccess } from "../restaurantAccess";
import {
  isEndpointConnectivityState,
  type EndpointConnectivityState,
} from "../../shared/printing/endpoints/endpointConnectivity";
import { isEndpointType, type EndpointType } from "../../shared/printing/endpoints/endpointTypes";
import type { EndpointOperationsFilter } from "./endpointOperationsTypes";
import {
  getEndpointOperationsItem,
  getEndpointOperationsSummary,
  listEndpointOperations,
} from "./endpointOperationsService";

function toOperationsFilter(
  input:
    | {
        restaurantId: number;
        endpointType?: string;
        connectivityState?: string;
      }
    | undefined
): EndpointOperationsFilter | undefined {
  if (!input) {
    return undefined;
  }

  return {
    restaurantId: input.restaurantId,
    endpointType: input.endpointType as EndpointType | undefined,
    connectivityState: input.connectivityState as EndpointConnectivityState | undefined,
  };
}

const restaurantInput = z.object({
  restaurantId: z.coerce.number().int().positive(),
});

const filterInput = restaurantInput.extend({
  endpointType: z
    .string()
    .optional()
    .refine((value) => value === undefined || isEndpointType(value), "Invalid endpointType"),
  connectivityState: z
    .string()
    .optional()
    .refine(
      (value) => value === undefined || isEndpointConnectivityState(value),
      "Invalid connectivityState"
    ),
});

export const endpointOperationsRouter = router({
  getSummary: verifiedProcedure.input(filterInput.optional()).query(async ({ input, ctx }) => {
    if (input?.restaurantId) {
      await assertRestaurantAccess(ctx, input.restaurantId, "endpointOps.getSummary");
    }
    return getEndpointOperationsSummary(toOperationsFilter(input));
  }),

  listEndpoints: verifiedProcedure.input(filterInput.optional()).query(async ({ input, ctx }) => {
    if (input?.restaurantId) {
      await assertRestaurantAccess(ctx, input.restaurantId, "endpointOps.listEndpoints");
    }
    return listEndpointOperations(toOperationsFilter(input));
  }),

  getEndpoint: verifiedProcedure
    .input(
      z.object({
        endpointId: z.string().trim().min(1),
        restaurantId: z.coerce.number().int().positive().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const item = getEndpointOperationsItem(input.endpointId);
      if (!item) {
        return { found: false as const };
      }
      if (input.restaurantId !== undefined && item.restaurantId !== input.restaurantId) {
        await assertRestaurantAccess(ctx, input.restaurantId, "endpointOps.getEndpoint");
        return { found: false as const };
      }
      await assertRestaurantAccess(ctx, item.restaurantId, "endpointOps.getEndpoint");
      return { found: true as const, endpoint: item };
    }),
});
