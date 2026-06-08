import { z } from "zod";
import { assertAdminAccess } from "../_core/assertAdminAccess";
import { protectedProcedure, router } from "../_core/trpc";
import { canonicalMetricsService } from "./metrics/CanonicalMetricsService";

/**
 * EXEC-3 / AR-4 Category C — canonical analytics (owner-based metrics only).
 */
export const analyticsRouter = router({
  getMRR: protectedProcedure
    .input(z.object({ now: z.string().datetime().optional() }).optional())
    .query(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "analytics.getMRR");
      const now = input?.now ? new Date(input.now) : new Date();
      return canonicalMetricsService.getMRR(now);
    }),

  getARR: protectedProcedure
    .input(z.object({ now: z.string().datetime().optional() }).optional())
    .query(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "analytics.getARR");
      const now = input?.now ? new Date(input.now) : new Date();
      return canonicalMetricsService.getARR(now);
    }),

  getPlanDistribution: protectedProcedure
    .input(z.object({ now: z.string().datetime().optional() }).optional())
    .query(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "analytics.getPlanDistribution");
      const now = input?.now ? new Date(input.now) : new Date();
      return canonicalMetricsService.getPlanDistribution(now);
    }),

  getSubscriberCounts: protectedProcedure
    .input(z.object({ now: z.string().datetime().optional() }).optional())
    .query(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "analytics.getSubscriberCounts");
      const now = input?.now ? new Date(input.now) : new Date();
      return canonicalMetricsService.getSubscriberCounts(now);
    }),

  getExpiringAccounts: protectedProcedure
    .input(z.object({ now: z.string().datetime().optional() }).optional())
    .query(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "analytics.getExpiringAccounts");
      const now = input?.now ? new Date(input.now) : new Date();
      return canonicalMetricsService.getExpiringAccounts(now);
    }),
});
