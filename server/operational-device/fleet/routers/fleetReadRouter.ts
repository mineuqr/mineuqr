import { z } from "zod";
import { verifiedProcedure, router } from "../../../_core/trpc";
import { assertRestaurantAccess } from "../../../restaurantAccess";
import { fleetComposition } from "../../fleetComposition";

const deviceRoleSchema = z.enum([
  "kitchen_display",
  "expo_display",
  "pickup_display",
  "customer_display",
  "print_monitor",
  "self_ordering_kiosk",
]);

const operationalStateSchema = z.enum([
  "initializing",
  "ready",
  "operational",
  "blocked",
  "degraded",
  "maintenance",
  "disconnected",
  "disposed",
]);

const connectivityStateSchema = z.enum([
  "connecting",
  "connected",
  "disconnected",
  "reconnecting",
  "offline",
  "unknown",
]);

const businessReadinessSchema = z.enum([
  "ready",
  "configuration_required",
  "pairing_required",
  "role_unavailable",
  "maintenance",
  "unknown",
]);

const fleetQueryInput = z.object({
  restaurantId: z.coerce.number().int().positive(),
  search: z.string().max(128).optional(),
  role: deviceRoleSchema.optional(),
  operationalState: operationalStateSchema.optional(),
  businessReadiness: businessReadinessSchema.optional(),
  connectivityState: connectivityStateSchema.optional(),
  branchId: z.coerce.number().int().positive().optional(),
  zoneId: z.coerce.number().int().positive().nullable().optional(),
  configurationState: z.enum(["valid", "invalid"]).optional(),
  sortBy: z
    .enum(["displayName", "lastSeen", "operationalState", "role", "created", "updated", "version"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().max(256).nullable().optional(),
  groupBy: z.enum(["restaurant", "branch", "zone", "role", "none"]).optional(),
});

/** SCREEN-FLEET-SCALE-1 — fleet read queries (server-side search/filter/sort/pagination). */
export const fleetReadRouter = router({
  queryScreens: verifiedProcedure.input(fleetQueryInput).query(async ({ input, ctx }) => {
    await assertRestaurantAccess(ctx, input.restaurantId, "operationalDevice.fleet.queryScreens");
    return fleetComposition.queryEngine.queryScreens(input);
  }),

  getKpis: verifiedProcedure
    .input(z.object({ restaurantId: z.coerce.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "operationalDevice.fleet.getKpis");
      return fleetComposition.queryEngine.getKpis(input.restaurantId);
    }),

  getObservability: verifiedProcedure
    .input(z.object({ restaurantId: z.coerce.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "operationalDevice.fleet.getObservability");
      const metrics = fleetComposition.queryEngine.getMetrics();
      return {
        generatedAt: new Date().toISOString(),
        cacheHits: metrics.cacheHits,
        cacheMisses: metrics.cacheMisses,
        totalQueries: metrics.totalQueries,
      };
    }),
});
