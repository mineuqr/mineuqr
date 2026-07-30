/**
 * COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1
 * Public Catalog API — published commercial offerings only.
 * Never exposes Draft / Internal Review / Approved / Scheduled / Retired / Archived.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../../_core/trpc";
import { assertAdminAccess } from "../../_core/assertAdminAccess";
import {
  COMMERCIAL_CATALOG_PUBLIC_PUBLISHING_PROGRAM,
  COMMERCIAL_CATALOG_ADR,
} from "@shared/commercial-catalog";
import { CommercialCatalogError } from "../../services/commercial-catalog";
import {
  listPublicCatalogOfferings,
  getPublicCatalogOffering,
  getPublicVersionVisibility,
  assertPublicCatalogNotEntitlementAuthority,
  catalogPublishingService,
  publicCatalogCacheStats,
} from "../../commercial-catalog/publishing";

function mapError(err: unknown): never {
  if (err instanceof CommercialCatalogError) {
    throw new TRPCError({
      code:
        err.code === "not_found"
          ? "NOT_FOUND"
          : err.code === "publication_validation_failed" ||
              err.code === "publication_persistence_failed"
            ? "BAD_REQUEST"
            : err.code === "immutable_version" || err.code === "invalid_transition"
              ? "FORBIDDEN"
              : "BAD_REQUEST",
      message: err.message,
    });
  }
  throw err;
}

function actorFromCtx(ctx: {
  user?: { id?: number; role?: string } | null;
  correlationId?: string;
}) {
  return {
    actorId: ctx.user?.id ?? null,
    actorRole: ctx.user?.role ?? null,
    correlationId: ctx.correlationId ?? null,
  };
}

/** Unauthenticated public browse surface. */
export const commercialCatalogPublicRouter = router({
  status: publicProcedure.query(() => ({
    program: COMMERCIAL_CATALOG_PUBLIC_PUBLISHING_PROGRAM,
    adr: COMMERCIAL_CATALOG_ADR,
    surface: "public-catalog" as const,
    entitlementAuthority: assertPublicCatalogNotEntitlementAuthority(),
  })),

  /** Published offerings only — draft/internal never returned. */
  listOfferings: publicProcedure.query(async () => {
    return listPublicCatalogOfferings();
  }),

  /**
   * Published or historically deprecated version.
   * Archived / retired / draft → NOT_FOUND.
   */
  getOffering: publicProcedure
    .input(z.object({ planVersionId: z.string().uuid() }))
    .query(async ({ input }) => {
      try {
        return await getPublicCatalogOffering(input.planVersionId);
      } catch (e) {
        mapError(e);
      }
    }),

  /** Published version metadata only — no draft revision internals. */
  getVersionVisibility: publicProcedure
    .input(z.object({ planVersionId: z.string().uuid() }))
    .query(async ({ input }) => {
      try {
        return await getPublicVersionVisibility(input.planVersionId);
      } catch (e) {
        mapError(e);
      }
    }),
});

/** Admin publication workflow (approve / schedule / archive). */
export const commercialCatalogPublishingRouter = router({
  getStatus: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.publishing.getStatus");
      try {
        return catalogPublishingService.getStatus(input.versionId);
      } catch (e) {
        mapError(e);
      }
    }),

  listStatuses: protectedProcedure.query(({ ctx }) => {
    assertAdminAccess(ctx, "commercialCatalog.publishing.listStatuses");
    return catalogPublishingService.listStatuses();
  }),

  approveVersion: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.publishing.approveVersion");
      try {
        return catalogPublishingService.approveVersion(
          input.versionId,
          {
            ...actorFromCtx(ctx),
            procedure: "commercialCatalog.publishing.approveVersion",
          }
        );
      } catch (e) {
        mapError(e);
      }
    }),

  schedulePublish: protectedProcedure
    .input(
      z.object({
        versionId: z.string().uuid(),
        effectiveAt: z.string().datetime(),
      })
    )
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.publishing.schedulePublish");
      try {
        return catalogPublishingService.schedulePublish(
          input.versionId,
          input.effectiveAt,
          {
            ...actorFromCtx(ctx),
            procedure: "commercialCatalog.publishing.schedulePublish",
          }
        );
      } catch (e) {
        mapError(e);
      }
    }),

  cancelSchedule: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.publishing.cancelSchedule");
      try {
        return catalogPublishingService.cancelSchedule(input.versionId, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.publishing.cancelSchedule",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  /**
   * Workflow-enforced publish (Approved or Scheduled required).
   * Existing commercialCatalog.publishVersion remains for direct draft→published compat.
   */
  publishVersion: protectedProcedure
    .input(
      z.object({
        versionId: z.string().uuid(),
        requiresRegionalPricing: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.publishing.publishVersion");
      try {
        return await catalogPublishingService.publish(
          input.versionId,
          {
            ...actorFromCtx(ctx),
            procedure: "commercialCatalog.publishing.publishVersion",
          },
          {
            requiresRegionalPricing: input.requiresRegionalPricing,
            enforceWorkflow: true,
          }
        );
      } catch (e) {
        mapError(e);
      }
    }),

  applyDueSchedules: protectedProcedure.mutation(async ({ ctx }) => {
    assertAdminAccess(ctx, "commercialCatalog.publishing.applyDueSchedules");
    return catalogPublishingService.applyDueSchedules({
      ...actorFromCtx(ctx),
      procedure: "commercialCatalog.publishing.applyDueSchedules",
    });
  }),

  deprecateVersion: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.publishing.deprecateVersion");
      try {
        return await catalogPublishingService.deprecate(input.versionId, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.publishing.deprecateVersion",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  retireVersion: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.publishing.retireVersion");
      try {
        return await catalogPublishingService.retire(input.versionId, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.publishing.retireVersion",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  archiveVersion: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.publishing.archiveVersion");
      try {
        return catalogPublishingService.archiveVersion(input.versionId, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.publishing.archiveVersion",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  cacheStats: protectedProcedure.query(({ ctx }) => {
    assertAdminAccess(ctx, "commercialCatalog.publishing.cacheStats");
    return publicCatalogCacheStats();
  }),
});
