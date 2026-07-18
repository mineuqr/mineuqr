import { z } from "zod";
import { verifiedProcedure, router } from "../_core/trpc";
import { assertRestaurantAccess } from "../restaurantAccess";
import { getRestaurantOverview } from "./restaurantOverview";
import { getActiveTablesBoard } from "./activeTablesBoard";
import { getActionCenter } from "./actionCenter";
import { getActivityFeed } from "./activityFeed";
import { ACTIVITY_FEED_DEFAULT_LIMIT, ACTIVITY_FEED_MAX_LIMIT } from "./operationalConstants";
import {
  getSettlementBreakdown,
  getSettlementSummary,
  getSettlementTrend,
} from "../analytics/settlementMetrics";

const settlementMetricsInput = z.object({
  restaurantId: z.number().int().positive(),
  from: z.string().optional(),
  to: z.string().optional(),
});

/**
 * OPS-DASHBOARD-2 — owner restaurant operations read API.
 *
 * REPORTING-CANONICAL-API-SUNSET-1:
 * `getSettlement*` procedures below are soft-sunset legacy reporting surfaces.
 * Canonical restaurant business KPIs: `reporting.*` only.
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

  /**
   * @deprecated REPORTING-CANONICAL-API-SUNSET-1 — Legacy Reporting Surface (non-canonical).
   * Soft-sunset: no production Dashboard/Reports consumers.
   * Canonical: `reporting.getBusinessMetricsSummary` (Paid Check grandTotal Revenue).
   * Do not use for new code. Backward compatible until hard-delete program.
   */
  getSettlementSummary: verifiedProcedure
    .input(settlementMetricsInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "ops.getSettlementSummary"
      );
      return getSettlementSummary(input);
    }),

  /**
   * @deprecated REPORTING-CANONICAL-API-SUNSET-1 — Legacy Reporting Surface (non-canonical).
   * Canonical: `reporting.getBusinessMetricsSummary`.
   */
  getSettlementBreakdown: verifiedProcedure
    .input(settlementMetricsInput)
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "ops.getSettlementBreakdown"
      );
      return getSettlementBreakdown(input);
    }),

  /**
   * @deprecated REPORTING-CANONICAL-API-SUNSET-1 — Legacy Reporting Surface (non-canonical).
   * Canonical: `reporting.getBusinessMetricsTrend`.
   */
  getSettlementTrend: verifiedProcedure
    .input(
      settlementMetricsInput.extend({
        grouping: z.enum(["day", "week", "month"]),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(
        ctx,
        input.restaurantId,
        "ops.getSettlementTrend"
      );
      return getSettlementTrend(input);
    }),
});
