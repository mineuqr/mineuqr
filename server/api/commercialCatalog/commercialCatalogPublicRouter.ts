/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * Public Catalog API — live commercial offerings (not hidden).
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../../_core/trpc";
import {
  COMMERCIAL_LIVE_PLANS_PROGRAM,
  COMMERCIAL_CATALOG_ADR,
} from "@shared/commercial-catalog";
import { CommercialCatalogError } from "../../services/commercial-catalog";
import {
  listPublicCatalogOfferings,
  getPublicCatalogOffering,
  assertPublicCatalogNotEntitlementAuthority,
  publicCatalogCacheStats,
} from "../../commercial-catalog/publishing";

function mapError(err: unknown): never {
  if (err instanceof CommercialCatalogError) {
    throw new TRPCError({
      code: err.code === "not_found" ? "NOT_FOUND" : "BAD_REQUEST",
      message: err.message,
    });
  }
  throw err;
}

export const commercialCatalogPublicRouter = router({
  status: publicProcedure.query(() => ({
    program: COMMERCIAL_LIVE_PLANS_PROGRAM,
    adr: COMMERCIAL_CATALOG_ADR,
    surface: "public-catalog" as const,
    entitlementAuthority: assertPublicCatalogNotEntitlementAuthority(),
    cache: publicCatalogCacheStats(),
  })),

  listOfferings: publicProcedure.query(async () => {
    return listPublicCatalogOfferings();
  }),

  getOffering: publicProcedure
    .input(z.object({ planId: z.string().uuid() }))
    .query(async ({ input }) => {
      try {
        return await getPublicCatalogOffering(input.planId);
      } catch (e) {
        mapError(e);
      }
    }),
});
