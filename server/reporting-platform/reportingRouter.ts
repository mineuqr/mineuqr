import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { verifiedProcedure, router } from "../_core/trpc";
import { assertRestaurantAccess } from "../restaurantAccess";
import {
  compareMetricValues,
  getBusinessMetricsSummary,
  getBusinessMetricsTrend,
  getCatalogStatsSummary,
  getComparisonBaselineRange,
  getKpiCatalog,
  getOperationalMetricsSnapshot,
  getOrderSalesRollup,
  getOrderSalesSummary,
  getPaymentMethodAnalytics,
  getSalesChannelAnalytics,
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
 * Official Reporting Platform API — exclusive canonical restaurant KPI surface.
 * REPORTING-CANONICAL-API-SUNSET-1: Legacy ops.getSettlement* / admin.getRevenueByMonth
 * are soft-sunset non-canonical surfaces (see LEGACY_REPORTING_SURFACES).
 */
export const reportingRouter = router({
  /**
   * Metadata-only KPI governance catalog (no values, no calculations).
   * Tenant-scoped access via restaurantId for audit consistency.
   */
  getKpiCatalog: verifiedProcedure
    .input(z.object({ restaurantId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "reporting.getKpiCatalog"
      );
      return getKpiCatalog();
    }),

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

  /**
   * Payment-method analytics from the canonical financial reporting source
   * (Settlement Record payment snapshots by default; Settlement Transactions
   * remain available for legacy/check source mode and payment-detail parity).
   * Does not replace BusinessMetricsSummary.revenue (Total Sales SSOT).
   */
  getPaymentMethodAnalytics: verifiedProcedure
    .input(periodInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "reporting.getPaymentMethodAnalytics"
      );
      try {
        return await getPaymentMethodAnalytics(input);
      } catch (err) {
        mapReportingError(err);
      }
    }),

  /**
   * REPORTING-SALES-CHANNEL-ANALYTICS-1 — Order Sales by ordering channel.
   * Does not replace BusinessMetricsSummary.revenue (Total Sales SSOT).
   */
  getSalesChannelAnalytics: verifiedProcedure
    .input(periodInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "reporting.getSalesChannelAnalytics"
      );
      try {
        return await getSalesChannelAnalytics(input);
      } catch (err) {
        mapReportingError(err);
      }
    }),

  /**
   * Canonical comparison DTO — presentation must not compute growth/delta.
   * Values must already come from reporting.* KPI DTOs (no formula change).
   */
  compareMetricValues: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number().int().positive(),
        strategy: z.enum([
          "previous_period",
          "previous_business_period",
          "previous_year",
        ]),
        currentValue: z.string(),
        previousValue: z.string(),
        currentFrom: z.string().nullable().optional(),
        currentTo: z.string().nullable().optional(),
        previousFrom: z.string().nullable().optional(),
        previousTo: z.string().nullable().optional(),
        metricId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "reporting.compareMetricValues"
      );
      return compareMetricValues(input);
    }),

  getComparisonBaselineRange: verifiedProcedure
    .input(
      z.object({
        restaurantId: z.number().int().positive(),
        strategy: z.enum([
          "previous_period",
          "previous_business_period",
          "previous_year",
        ]),
        granularity: z.enum([
          "hour",
          "day",
          "week",
          "month",
          "quarter",
          "year",
        ]),
        year: z.number().int().positive(),
        month: z.number().int().min(1).max(12).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "reporting.getComparisonBaselineRange"
      );
      return getComparisonBaselineRange(input);
    }),
});
