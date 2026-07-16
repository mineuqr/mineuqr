import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { verifiedProcedure, router } from "../_core/trpc";
import { assertRestaurantAccess } from "../restaurantAccess";
import {
  getBusinessMetricsSummary,
  getBusinessMetricsTrend,
  getCatalogStatsSummary,
  getOperationalMetricsSnapshot,
  getOrderSalesRollup,
  getOrderSalesSummary,
  ReportingValidationError,
} from "./ReportingService";

const periodInput = z.object({
  restaurantId: z.number().int().positive(),
  from: z.string().optional(),
  to: z.string().optional(),
});

function mapReportingError(err: unknown): never {
  if (err instanceof ReportingValidationError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
  }
  throw err;
}

/**
 * Official Reporting Platform API — sole business KPI contract surface.
 * Legacy ops.getSettlement* remains for transitional clients until cutover.
 */
export const reportingRouter = router({
  getBusinessMetricsSummary: verifiedProcedure
    .input(periodInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "reporting.getBusinessMetricsSummary"
      );
      try {
        return await getBusinessMetricsSummary(input);
      } catch (err) {
        mapReportingError(err);
      }
    }),

  getBusinessMetricsTrend: verifiedProcedure
    .input(
      periodInput.extend({
        grouping: z.enum(["day", "week", "month"]),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "reporting.getBusinessMetricsTrend"
      );
      try {
        return await getBusinessMetricsTrend(input);
      } catch (err) {
        mapReportingError(err);
      }
    }),

  getOperationalMetricsSnapshot: verifiedProcedure
    .input(z.object({ restaurantId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "reporting.getOperationalMetricsSnapshot"
      );
      try {
        return await getOperationalMetricsSnapshot(input.restaurantId);
      } catch (err) {
        mapReportingError(err);
      }
    }),

  getOrderSalesSummary: verifiedProcedure
    .input(z.object({ restaurantId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "reporting.getOrderSalesSummary"
      );
      try {
        return await getOrderSalesSummary(input.restaurantId);
      } catch (err) {
        mapReportingError(err);
      }
    }),

  getOrderSalesRollup: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number().int().positive(),
        granularity: z.enum(["day", "month"]),
        year: z.number().int().positive(),
        month: z.number().int().min(1).max(12).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "reporting.getOrderSalesRollup"
      );
      try {
        return await getOrderSalesRollup(input);
      } catch (err) {
        mapReportingError(err);
      }
    }),

  getCatalogStatsSummary: verifiedProcedure
    .input(z.object({ restaurantId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "reporting.getCatalogStatsSummary"
      );
      try {
        return await getCatalogStatsSummary(input.restaurantId);
      } catch (err) {
        mapReportingError(err);
      }
    }),
});
