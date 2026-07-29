/**
 * COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1
 * Internal tRPC surface — Commercial Catalog CRUD + publication.
 * No Subscription APIs. No payment APIs.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { assertAdminAccess } from "../../_core/assertAdminAccess";
import { protectedProcedure, router } from "../../_core/trpc";
import {
  COMMERCIAL_CATALOG_FOUNDATION_PROGRAM,
  COMMERCIAL_CATALOG_ADR,
} from "@shared/commercial-catalog";
import {
  CommercialCatalogError,
  commercialSnapshotService,
  featureBundleService,
  getCommercialCatalogHealth,
  limitProfileService,
  migrationPolicyService,
  planService,
  planVersionService,
  pricingService,
  promotionService,
  publicationService,
  regionalPolicyService,
  trialPolicyCatalogService,
} from "../../services/commercial-catalog";

const compatibilitySchema = z.object({
  upgradeTargets: z.array(z.string()),
  downgradeTargets: z.array(z.string()),
  migrationRequirements: z.array(z.string()),
  breakingCommercialChanges: z.array(z.string()),
});

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

function mapError(err: unknown): never {
  if (err instanceof CommercialCatalogError) {
    throw new TRPCError({
      code:
        err.code === "not_found"
          ? "NOT_FOUND"
          : err.code === "publication_validation_failed"
            ? "BAD_REQUEST"
            : err.code === "immutable_version" || err.code === "invalid_transition"
              ? "FORBIDDEN"
              : "BAD_REQUEST",
      message: err.message,
    });
  }
  throw err;
}

export const commercialCatalogRouter = router({
  status: protectedProcedure.query(({ ctx }) => {
    assertAdminAccess(ctx, "commercialCatalog.status");
    return {
      program: COMMERCIAL_CATALOG_FOUNDATION_PROGRAM,
      adr: COMMERCIAL_CATALOG_ADR,
      paymentProviders: false,
      subscriptionRuntime: false,
      health: getCommercialCatalogHealth(),
    };
  }),

  health: protectedProcedure.query(({ ctx }) => {
    assertAdminAccess(ctx, "commercialCatalog.health");
    return getCommercialCatalogHealth();
  }),

  // ── Plans ──────────────────────────────────────────────
  listPlans: protectedProcedure.query(({ ctx }) => {
    assertAdminAccess(ctx, "commercialCatalog.listPlans");
    return planService.list();
  }),

  createPlan: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1).max(64),
        name: z.string().min(1).max(255),
        description: z.string().nullable().optional(),
        sortOrder: z.number().int().optional(),
        isHidden: z.boolean().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.createPlan");
      try {
        return planService.create(input, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.createPlan",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  updatePlan: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().nullable().optional(),
        sortOrder: z.number().int().optional(),
        isHidden: z.boolean().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.updatePlan");
      try {
        const { id, ...patch } = input;
        return planService.update(id, patch, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.updatePlan",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  // ── Versions ───────────────────────────────────────────
  listVersions: protectedProcedure
    .input(z.object({ planId: z.string().uuid().optional() }).optional())
    .query(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.listVersions");
      return planVersionService.list(input?.planId);
    }),

  createVersion: protectedProcedure
    .input(
      z.object({
        planId: z.string().uuid(),
        versionCode: z.string().min(1).max(64),
        versionName: z.string().min(1).max(255),
        featureBundleId: z.string().uuid().nullable().optional(),
        limitProfileId: z.string().uuid().nullable().optional(),
        trialPolicyId: z.string().uuid().nullable().optional(),
        migrationPolicyId: z.string().uuid().nullable().optional(),
        retirementPolicyId: z.string().uuid().nullable().optional(),
        compatibility: compatibilitySchema.optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.createVersion");
      try {
        return planVersionService.create(input, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.createVersion",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  updateDraftVersion: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        versionName: z.string().min(1).max(255).optional(),
        featureBundleId: z.string().uuid().nullable().optional(),
        limitProfileId: z.string().uuid().nullable().optional(),
        trialPolicyId: z.string().uuid().nullable().optional(),
        migrationPolicyId: z.string().uuid().nullable().optional(),
        retirementPolicyId: z.string().uuid().nullable().optional(),
        compatibility: compatibilitySchema.optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.updateDraftVersion");
      try {
        const { id, ...patch } = input;
        return planVersionService.updateDraft(id, patch, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.updateDraftVersion",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  // ── Pricing / cycles ───────────────────────────────────
  listPrices: protectedProcedure
    .input(z.object({ planVersionId: z.string().uuid().optional() }).optional())
    .query(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.listPrices");
      return pricingService.list(input?.planVersionId);
    }),

  createPrice: protectedProcedure
    .input(
      z.object({
        planVersionId: z.string().uuid(),
        billingCycleId: z.string().uuid(),
        currency: z.string().min(3).max(8),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        regionId: z.string().uuid().nullable().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.createPrice");
      try {
        return pricingService.create(input, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.createPrice",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  listBillingCycles: protectedProcedure.query(({ ctx }) => {
    assertAdminAccess(ctx, "commercialCatalog.listBillingCycles");
    return pricingService.listBillingCycles();
  }),

  createBillingCycle: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1).max(64),
        name: z.string().min(1).max(255),
        intervalCount: z.number().int().positive(),
        intervalUnit: z.enum(["day", "week", "month", "year"]),
      })
    )
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.createBillingCycle");
      try {
        return pricingService.createBillingCycle(input, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.createBillingCycle",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  // ── Bundles / limits / trials ──────────────────────────
  listFeatureBundles: protectedProcedure.query(({ ctx }) => {
    assertAdminAccess(ctx, "commercialCatalog.listFeatureBundles");
    return featureBundleService.list().map((b) => ({
      ...b,
      features: featureBundleService.listFeatures(b.id),
    }));
  }),

  createFeatureBundle: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1).max(64),
        name: z.string().min(1).max(255),
        description: z.string().nullable().optional(),
        features: z
          .array(
            z.object({
              featureKey: z.string().min(1).max(128),
              included: z.boolean().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.createFeatureBundle");
      try {
        return featureBundleService.create(input, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.createFeatureBundle",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  listLimitProfiles: protectedProcedure.query(({ ctx }) => {
    assertAdminAccess(ctx, "commercialCatalog.listLimitProfiles");
    return limitProfileService.list().map((p) => ({
      ...p,
      values: limitProfileService.listValues(p.id),
    }));
  }),

  createLimitProfile: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1).max(64),
        name: z.string().min(1).max(255),
        description: z.string().nullable().optional(),
        values: z
          .array(
            z.object({
              limitKey: z.string().min(1).max(128),
              value: z.number().nullable(),
              unit: z.string().nullable().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.createLimitProfile");
      try {
        return limitProfileService.create(input, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.createLimitProfile",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  listTrialPolicies: protectedProcedure.query(({ ctx }) => {
    assertAdminAccess(ctx, "commercialCatalog.listTrialPolicies");
    return trialPolicyCatalogService.list();
  }),

  createTrialPolicy: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1).max(64),
        name: z.string().min(1).max(255),
        durationDays: z.number().int().positive(),
        description: z.string().nullable().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.createTrialPolicy");
      try {
        return trialPolicyCatalogService.create(input, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.createTrialPolicy",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  // ── Promotions ─────────────────────────────────────────
  listPromotions: protectedProcedure.query(({ ctx }) => {
    assertAdminAccess(ctx, "commercialCatalog.listPromotions");
    return promotionService.list();
  }),

  createPromotion: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1).max(64),
        name: z.string().min(1).max(255),
        effectSummary: z.string().min(1),
        eligiblePlanVersionIds: z.array(z.string().uuid()).optional(),
        startsAt: z.string().nullable().optional(),
        endsAt: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.createPromotion");
      try {
        return promotionService.create(input, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.createPromotion",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  // ── Regions ────────────────────────────────────────────
  listRegions: protectedProcedure.query(({ ctx }) => {
    assertAdminAccess(ctx, "commercialCatalog.listRegions");
    return regionalPolicyService.list();
  }),

  createRegion: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1).max(64),
        name: z.string().min(1).max(255),
        countryCode: z.string().min(2).max(8),
        currency: z.string().min(3).max(8),
        taxPolicyRef: z.string().nullable().optional(),
        distributionPartner: z.string().nullable().optional(),
        regulatoryNotes: z.string().nullable().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.createRegion");
      try {
        return regionalPolicyService.create(input, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.createRegion",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  updateRegion: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        countryCode: z.string().min(2).max(8).optional(),
        currency: z.string().min(3).max(8).optional(),
        taxPolicyRef: z.string().nullable().optional(),
        distributionPartner: z.string().nullable().optional(),
        regulatoryNotes: z.string().nullable().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.updateRegion");
      try {
        const { id, ...patch } = input;
        return regionalPolicyService.update(id, patch, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.updateRegion",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  // ── Migration / retirement ─────────────────────────────
  listMigrationPolicies: protectedProcedure.query(({ ctx }) => {
    assertAdminAccess(ctx, "commercialCatalog.listMigrationPolicies");
    return migrationPolicyService.list();
  }),

  createMigrationPolicy: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1).max(64),
        name: z.string().min(1).max(255),
        description: z.string().nullable().optional(),
        requiresExplicitAction: z.boolean().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.createMigrationPolicy");
      try {
        return migrationPolicyService.create(input, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.createMigrationPolicy",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  listRetirementPolicies: protectedProcedure.query(({ ctx }) => {
    assertAdminAccess(ctx, "commercialCatalog.listRetirementPolicies");
    return migrationPolicyService.listRetirementPolicies();
  }),

  createRetirementPolicy: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1).max(64),
        name: z.string().min(1).max(255),
        description: z.string().nullable().optional(),
        allowRenewals: z.boolean().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.createRetirementPolicy");
      try {
        return migrationPolicyService.createRetirementPolicy(input, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.createRetirementPolicy",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  // ── Publication ────────────────────────────────────────
  validatePublication: protectedProcedure
    .input(
      z.object({
        versionId: z.string().uuid(),
        requiresRegionalPricing: z.boolean().optional(),
      })
    )
    .query(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.validatePublication");
      return publicationService.validate(input.versionId, {
        requiresRegionalPricing: input.requiresRegionalPricing,
      });
    }),

  publishVersion: protectedProcedure
    .input(
      z.object({
        versionId: z.string().uuid(),
        requiresRegionalPricing: z.boolean().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.publishVersion");
      try {
        return publicationService.publish(
          input.versionId,
          {
            ...actorFromCtx(ctx),
            procedure: "commercialCatalog.publishVersion",
          },
          { requiresRegionalPricing: input.requiresRegionalPricing }
        );
      } catch (e) {
        mapError(e);
      }
    }),

  deprecateVersion: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.deprecateVersion");
      try {
        return publicationService.deprecate(input.versionId, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.deprecateVersion",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  retireVersion: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.retireVersion");
      try {
        return publicationService.retire(input.versionId, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.retireVersion",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  // ── Snapshots (definitions only) ───────────────────────
  listSnapshots: protectedProcedure
    .input(z.object({ planVersionId: z.string().uuid().optional() }).optional())
    .query(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.listSnapshots");
      return commercialSnapshotService.list(input?.planVersionId);
    }),

  captureSnapshotDefinition: protectedProcedure
    .input(
      z.object({
        planVersionId: z.string().uuid(),
        effectiveDate: z.string().optional(),
        promotionId: z.string().uuid().nullable().optional(),
        regionId: z.string().uuid().nullable().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.captureSnapshotDefinition");
      try {
        return commercialSnapshotService.captureFromVersion(input.planVersionId, {
          effectiveDate: input.effectiveDate,
          promotionId: input.promotionId,
          regionId: input.regionId,
        });
      } catch (e) {
        mapError(e);
      }
    }),
});
