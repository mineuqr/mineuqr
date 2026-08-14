/**
 * COMMERCIAL-CATALOG-LOCALIZATION-IMPLEMENTATION-1
 * Server-side visitor country + dual-price presentation API.
 */

import { z } from "zod";
import type { Request } from "express";
import {
  ADMIN_LOCALIZATION_PREVIEW_MARKETS,
  COMMERCIAL_CANONICAL_CURRENCY,
  COMMERCIAL_CATALOG_LOCALIZATION_PROGRAM,
  commercialLocalizationObservability,
  getFxService,
  resolveDualPricePresentation,
  resolveVisitorCountry,
  type PriceRowInput,
  type RegionRowInput,
} from "@shared/commercial-catalog";
import { assertAdminAccess } from "../../_core/assertAdminAccess";
import { protectedProcedure, publicProcedure, router } from "../../_core/trpc";
import {
  pricingService,
  regionalPolicyService,
} from "../../services/commercial-catalog";

function headerCountry(req: Request, name: string): string | null {
  const raw = req.headers[name.toLowerCase()];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw[0]) return raw[0];
  return null;
}

/**
 * Extract country hints from the incoming request.
 * Language / Accept-Language is intentionally ignored (GEO-01).
 */
export function extractCountryHintsFromRequest(req: Request): {
  cloudflareCountry: string | null;
  geoIpCountry: string | null;
} {
  const cloudflareCountry =
    headerCountry(req, "cf-ipcountry") ||
    headerCountry(req, "CF-IPCountry");

  const geoIpCountry =
    headerCountry(req, "x-geo-country") ||
    headerCountry(req, "x-vercel-ip-country") ||
    headerCountry(req, "x-appengine-country");

  if (!cloudflareCountry && !geoIpCountry) {
    /* counted when resolve falls through after failed providers — see resolve */
  }

  return { cloudflareCountry, geoIpCountry };
}

export function resolveRequestCountry(
  req: Request,
  manualCountry?: string | null
) {
  const hints = extractCountryHintsFromRequest(req);
  const result = resolveVisitorCountry({
    manualCountry,
    cloudflareCountry: hints.cloudflareCountry,
    geoIpCountry: hints.geoIpCountry,
  });
  commercialLocalizationObservability.recordCountry(
    result.countryCode,
    result.source
  );
  if (
    result.source === "default_us" &&
    !manualCountry &&
    !hints.cloudflareCountry &&
    !hints.geoIpCountry
  ) {
    /* soft: no provider data — not necessarily a failure */
  }
  return result;
}

async function dualForCountry(
  prices: PriceRowInput[],
  regions: RegionRowInput[],
  countryCode: string,
  countrySource: ReturnType<typeof resolveVisitorCountry>["source"]
) {
  const fx = getFxService();
  await fx.ensureRates();
  const presentation = resolveDualPricePresentation({
    prices,
    regions,
    countryCode,
    countrySource,
    convert: (amount, from, to) => fx.convertSync(amount, from, to),
  });
  commercialLocalizationObservability.recordCurrencySource(
    presentation.currencySource
  );
  if (presentation.currencySource === "usd_fallback" && countryCode !== "US") {
    /* may indicate FX miss */
  }
  return presentation;
}

export const commercialCatalogLocalizationRouter = router({
  meta: publicProcedure.query(() => ({
    program: COMMERCIAL_CATALOG_LOCALIZATION_PROGRAM,
    canonicalCurrency: COMMERCIAL_CANONICAL_CURRENCY,
  })),

  resolveVisitorContext: publicProcedure
    .input(
      z
        .object({
          manualCountry: z.string().length(2).optional(),
        })
        .optional()
    )
    .query(({ ctx, input }) => {
      const resolved = resolveRequestCountry(
        ctx.req,
        input?.manualCountry ?? null
      );
      return {
        ...resolved,
        canonicalCurrency: COMMERCIAL_CANONICAL_CURRENCY,
      };
    }),

  /**
   * Public dual-price presentation for arbitrary price rows (Catalog or legacy bridge).
   * Does not mutate Catalog. Does not change subscription/payment amounts.
   */
  presentDualPrice: publicProcedure
    .input(
      z.object({
        manualCountry: z.string().length(2).optional(),
        prices: z.array(
          z.object({
            amount: z.string(),
            currency: z.string().min(3).max(8),
            regionId: z.string().nullable().optional(),
          })
        ),
        regions: z
          .array(
            z.object({
              id: z.string(),
              countryCode: z.string().length(2),
              currency: z.string().min(3).max(8),
            })
          )
          .default([]),
      })
    )
    .query(async ({ ctx, input }) => {
      const country = resolveRequestCountry(
        ctx.req,
        input.manualCountry ?? null
      );
      const presentation = await dualForCountry(
        input.prices,
        input.regions,
        country.countryCode,
        country.source
      );
      return {
        country,
        presentation,
        priceSourceLabel:
          presentation.currencySource === "regional_override"
            ? "regional_price"
            : presentation.currencySource === "fx"
              ? "converted_from_usd"
              : "usd",
      };
    }),

  presentCatalogPrices: publicProcedure
    .input(
      z.object({
        planId: z.string().uuid(),
        manualCountry: z.string().length(2).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const country = resolveRequestCountry(
        ctx.req,
        input.manualCountry ?? null
      );
      const prices = pricingService.list(input.planId).map((p) => ({
        amount: p.amount,
        currency: p.currency,
        regionId: p.regionId,
      }));
      const regions = regionalPolicyService.list().map((r) => ({
        id: r.id,
        countryCode: r.countryCode,
        currency: r.currency,
      }));
      const presentation = await dualForCountry(
        prices,
        regions,
        country.countryCode,
        country.source
      );
      return {
        country,
        presentation,
        priceSourceLabel:
          presentation.currencySource === "regional_override"
            ? "regional_price"
            : presentation.currencySource === "fx"
              ? "converted_from_usd"
              : "usd",
        prices,
        regions,
      };
    }),

  adminMarketPreview: protectedProcedure
    .input(
      z.object({
        prices: z.array(
          z.object({
            amount: z.string(),
            currency: z.string().min(3).max(8),
            regionId: z.string().nullable().optional(),
          })
        ),
        regions: z
          .array(
            z.object({
              id: z.string(),
              countryCode: z.string().length(2),
              currency: z.string().min(3).max(8),
            })
          )
          .default([]),
      })
    )
    .query(async ({ ctx, input }) => {
      assertAdminAccess(ctx, "commercialCatalog.adminMarketPreview");
      const fx = getFxService();
      await fx.ensureRates();
      const markets = ADMIN_LOCALIZATION_PREVIEW_MARKETS.map((m) => {
        const presentation = resolveDualPricePresentation({
          prices: input.prices,
          regions: input.regions,
          countryCode: m.countryCode,
          convert: (amount, from, to) => fx.convertSync(amount, from, to),
        });
        return {
          countryCode: m.countryCode,
          currency: m.currency,
          labelKey: m.labelKey,
          presentation,
        };
      });
      return {
        canonicalCurrency: COMMERCIAL_CANONICAL_CURRENCY,
        markets,
        readOnly: true as const,
      };
    }),

  observabilitySnapshot: protectedProcedure.query(({ ctx }) => {
    assertAdminAccess(ctx, "commercialCatalog.localizationObservability");
    return commercialLocalizationObservability.snapshot();
  }),
});
