/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * Internal tRPC surface — Live Commercial Plans CRUD + atomic save.
 * No Subscription APIs. No payment APIs. No version lifecycle.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { assertAdminAccess } from "../../_core/assertAdminAccess";
import { protectedProcedure, router } from "../../_core/trpc";
import {
  COMMERCIAL_LIVE_PLANS_PROGRAM,
  COMMERCIAL_CATALOG_ADR,
  COMMERCIAL_CANONICAL_CURRENCY,
} from "@shared/commercial-catalog";
import {
  CommercialCatalogError,
  featureBundleService,
  getCommercialCatalogHealth,
  limitProfileService,
  migrationPolicyService,
  planService,
  pricingService,
  promotionService,
  regionalPolicyService,
  trialPolicyCatalogService,
  planSaveValidator,
} from "../../services/commercial-catalog";
import { commercialCatalogLocalizationRouter } from "./commercialCatalogLocalizationRouter";
import { commercialCatalogPublicRouter } from "./commercialCatalogPublicRouter";

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
          : err.code === "publication_validation_failed" ||
              err.code === "publication_persistence_failed"
            ? "BAD_REQUEST"
            : "BAD_REQUEST",
      message: err.message,
    });
  }
  throw err;
}

export const commercialCatalogRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    assertAdminAccess(ctx, "commercialCatalog.status");
    const { ensureCatalogReady } = await import(
      "../../services/commercial-catalog"
    );
    await ensureCatalogReady();
    return {
      program: COMMERCIAL_LIVE_PLANS_PROGRAM,
      adr: COMMERCIAL_CATALOG_ADR,
      paymentProviders: false,
      subscriptionRuntime: false,
      health: getCommercialCatalogHealth(),
    };
  }),

  adoptionStatus: protectedProcedure.query(async ({ ctx }) => {
    assertAdminAccess(ctx, "commercialCatalog.adoptionStatus");
    const { ensureCatalogReady, getAdoptionObservability } = await import(
      "../../services/commercial-catalog"
    );
    await ensureCatalogReady();
    return getAdoptionObservability();
  }),

  listPublishedOfferings: protectedProcedure.query(async ({ ctx }) => {
    assertAdminAccess(ctx, "commercialCatalog.listPublishedOfferings");
    const { listLivePlanOfferings } = await import(
      "../../services/commercial-catalog"
    );
    return listLivePlanOfferings();
  }),

  health: protectedProcedure.query(async ({ ctx }) => {
    assertAdminAccess(ctx, "commercialCatalog.health");
    const { ensureCatalogReady } = await import(
      "../../services/commercial-catalog"
    );
    await ensureCatalogReady();
    return getCommercialCatalogHealth();
  }),

  listPlans: protectedProcedure.query(async ({ ctx }) => {
    assertAdminAccess(ctx, "commercialCatalog.listPlans");
    const { ensureCatalogReady } = await import(
      "../../services/commercial-catalog"
    );
    await ensureCatalogReady();
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
        featureBundleId: z.string().uuid().nullable().optional(),
        limitProfileId: z.string().uuid().nullable().optional(),
        trialPolicyId: z.string().uuid().nullable().optional(),
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
        featureBundleId: z.string().uuid().nullable().optional(),
        limitProfileId: z.string().uuid().nullable().optional(),
        trialPolicyId: z.string().uuid().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.updatePlan");
      try {
        const { id, ...patch } = input;
        return await planService.saveLive(id, patch, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.updatePlan",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  validatePlanSave: protectedProcedure
    .input(
      z.object({
        planId: z.string().uuid(),
        requiresRegionalPricing: z.boolean().optional(),
      })
    )
    .query(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.validatePlanSave");
      return planSaveValidator.validate(input.planId, {
        requiresRegionalPricing: input.requiresRegionalPricing,
      });
    }),

  saveLivePlan: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().nullable().optional(),
        sortOrder: z.number().int().optional(),
        isHidden: z.boolean().optional(),
        featureBundleId: z.string().uuid().nullable().optional(),
        limitProfileId: z.string().uuid().nullable().optional(),
        trialPolicyId: z.string().uuid().nullable().optional(),
        requiresRegionalPricing: z.boolean().optional(),
        prices: z
          .array(
            z.object({
              billingCycleId: z.string().uuid(),
              currency: z.string().min(3).max(8),
              amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
              regionId: z.string().uuid().nullable().optional(),
            })
          )
          .optional(),
        capabilities: z
          .array(
            z.object({
              featureKey: z.string().min(1).max(128),
              included: z.boolean().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.saveLivePlan");
      try {
        const actor = {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.saveLivePlan",
        };
        return await planService.saveLive(
          input.id,
          {
            name: input.name,
            description: input.description,
            sortOrder: input.sortOrder,
            isHidden: input.isHidden,
            featureBundleId: input.featureBundleId,
            limitProfileId: input.limitProfileId,
            trialPolicyId: input.trialPolicyId,
          },
          actor,
          {
            requiresRegionalPricing: input.requiresRegionalPricing,
            prices: input.prices,
            capabilities: input.capabilities,
          }
        );
      } catch (e) {
        mapError(e);
      }
    }),

  listPrices: protectedProcedure
    .input(z.object({ planId: z.string().uuid().optional() }).optional())
    .query(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.listPrices");
      return pricingService.list(input?.planId);
    }),

  createPrice: protectedProcedure
    .input(
      z.object({
        planId: z.string().uuid(),
        billingCycleId: z.string().uuid(),
        currency: z.string().min(3).max(8).default(COMMERCIAL_CANONICAL_CURRENCY),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        regionId: z.string().uuid().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.createPrice");
      const isRegionalOverride = Boolean(input.regionId);
      const currency = isRegionalOverride
        ? input.currency.toUpperCase()
        : COMMERCIAL_CANONICAL_CURRENCY;
      if (!isRegionalOverride && input.currency.toUpperCase() !== COMMERCIAL_CANONICAL_CURRENCY) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Canonical Catalog prices must be USD. Use regionId for local overrides.",
        });
      }
      try {
        const price = pricingService.create(
          {
            planId: input.planId,
            billingCycleId: input.billingCycleId,
            currency,
            amount: input.amount,
            regionId: input.regionId ?? null,
          },
          {
            ...actorFromCtx(ctx),
            procedure: "commercialCatalog.createPrice",
          }
        );
        const { persistLivePlan } = await import(
          "../../services/commercial-catalog/livePlanPersistence"
        );
        await persistLivePlan(input.planId);
        const { invalidatePublicCatalogCache } = await import(
          "../../commercial-catalog/publishing"
        );
        invalidatePublicCatalogCache();
        return price;
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
        eligiblePlanIds: z.array(z.string().uuid()).optional(),
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

  updateMigrationPolicy: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().nullable().optional(),
        requiresExplicitAction: z.boolean().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.updateMigrationPolicy");
      try {
        const { id, ...patch } = input;
        return migrationPolicyService.update(id, patch, {
          ...actorFromCtx(ctx),
          procedure: "commercialCatalog.updateMigrationPolicy",
        });
      } catch (e) {
        mapError(e);
      }
    }),

  public: commercialCatalogPublicRouter,
  localization: commercialCatalogLocalizationRouter,
});
