/**
 * THERMAL-PRINTING-11C — read-only print operations tRPC router.
 */
import { z } from "zod";
import { verifiedProcedure, router } from "../_core/trpc";
import { assertRestaurantAccess } from "../restaurantAccess";
import {
  getPrintJobDetail,
  getPrintOperationsSummary,
  getPrinterDetail,
  listPrintFailures,
  listPrintJobQueue,
  listPrinterOverview,
  listStationOverview,
  listAgentOverview,
} from "./printOperationsService";

const restaurantInput = z.object({
  restaurantId: z.coerce.number().int().positive(),
});

const paginationInput = restaurantInput.extend({
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export const printOperationsRouter = router({
  getSummary: verifiedProcedure.input(restaurantInput).query(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "printOps.getSummary");
    return getPrintOperationsSummary(input.restaurantId);
  }),

  listPrinters: verifiedProcedure.input(restaurantInput).query(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "printOps.listPrinters");
    return listPrinterOverview(input.restaurantId);
  }),

  listStations: verifiedProcedure.input(restaurantInput).query(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "printOps.listStations");
    return listStationOverview(input.restaurantId);
  }),

  listAgents: verifiedProcedure.input(restaurantInput).query(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "printOps.listAgents");
    return listAgentOverview(input.restaurantId);
  }),

  getPrinter: verifiedProcedure
    .input(
      restaurantInput.extend({
        printerId: z.number().int().positive(),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printOps.getPrinter");
      const detail = await getPrinterDetail(input.restaurantId, input.printerId);
      if (!detail) {
        return { found: false as const };
      }
      return { found: true as const, printer: detail };
    }),

  listPrintJobs: verifiedProcedure.input(paginationInput).query(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "printOps.listPrintJobs");
    return listPrintJobQueue(input.restaurantId, {
      limit: input.limit,
      offset: input.offset,
    });
  }),

  getPrintJob: verifiedProcedure
    .input(
      restaurantInput.extend({
        jobId: z.number().int().positive(),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printOps.getPrintJob");
      const detail = await getPrintJobDetail(input.restaurantId, input.jobId);
      if (!detail) {
        return { found: false as const };
      }
      return { found: true as const, job: detail };
    }),

  listFailures: verifiedProcedure
    .input(
      restaurantInput.extend({
        limit: z.number().int().positive().max(100).default(25),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printOps.listFailures");
      return listPrintFailures(input.restaurantId, input.limit);
    }),
});
