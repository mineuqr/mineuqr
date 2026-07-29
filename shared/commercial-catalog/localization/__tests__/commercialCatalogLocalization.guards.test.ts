/**
 * COMMERCIAL-CATALOG-LOCALIZATION-IMPLEMENTATION-1 — unit + architecture guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  COMMERCIAL_CANONICAL_CURRENCY,
  DEFAULT_USD_RATES,
  FxService,
  StaticFxProvider,
  formatCommercialCurrency,
  resolveDualPricePresentation,
  resolveVisitorCountry,
} from "../index";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("commercial catalog localization", () => {
  it("resolves country Manual → Cloudflare → GeoIP → US and ignores language", () => {
    expect(
      resolveVisitorCountry({
        manualCountry: "sa",
        cloudflareCountry: "DE",
        geoIpCountry: "JP",
      }).source
    ).toBe("manual");
    expect(
      resolveVisitorCountry({
        cloudflareCountry: "DE",
        geoIpCountry: "JP",
      })
    ).toEqual({ countryCode: "DE", source: "cloudflare" });
    expect(
      resolveVisitorCountry({ geoIpCountry: "JP" })
    ).toEqual({ countryCode: "JP", source: "geoip" });
    expect(resolveVisitorCountry({})).toEqual({
      countryCode: "US",
      source: "default_us",
    });
  });

  it("prefers regional override then FX then USD", () => {
    const fx = new FxService({ provider: new StaticFxProvider() });
    const convert = (a: number, from: string, to: string) =>
      fx.convertSync(a, from, to, DEFAULT_USD_RATES);

    const withOverride = resolveDualPricePresentation({
      prices: [
        { amount: "19", currency: "USD", regionId: null },
        { amount: "69", currency: "SAR", regionId: "reg-sa" },
      ],
      regions: [{ id: "reg-sa", countryCode: "SA", currency: "SAR" }],
      countryCode: "SA",
      convert,
    });
    expect(withOverride.currencySource).toBe("regional_override");
    expect(withOverride.localAmount).toBe("69.00");
    expect(withOverride.localIsApproximate).toBe(false);
    expect(withOverride.canonicalAmount).toBe("19.00");

    const withFx = resolveDualPricePresentation({
      prices: [{ amount: "19", currency: "USD", regionId: null }],
      regions: [],
      countryCode: "SA",
      convert,
    });
    expect(withFx.currencySource).toBe("fx");
    expect(withFx.localIsApproximate).toBe(true);
    expect(Number(withFx.localAmount)).toBeCloseTo(19 * 3.75, 1);
  });

  it("formats currency via Intl", () => {
    const en = formatCommercialCurrency("19", "USD", "en-US");
    expect(en).toMatch(/19/);
    const ar = formatCommercialCurrency("71", "SAR", "ar");
    expect(ar.length).toBeGreaterThan(0);
  });

  it("keeps canonical currency USD", () => {
    expect(COMMERCIAL_CANONICAL_CURRENCY).toBe("USD");
  });

  it("wires localization into Catalog composition and createPrice USD gate", () => {
    const composition = read(
      "client/src/components/admin/platform-ops/PlatformOpsCommercialCatalogComposition.tsx"
    );
    expect(composition).toContain(
      "COMMERCIAL-CATALOG-LOCALIZATION-IMPLEMENTATION-1"
    );
    expect(composition).toContain("EXPERIENCE_TAB_I18N_KEYS");
    expect(composition).toContain("MANAGEMENT_SECTION_I18N_KEYS");

    const router = read(
      "server/api/commercialCatalog/commercialCatalogRouter.ts"
    );
    expect(router).toContain("COMMERCIAL_CANONICAL_CURRENCY");
    expect(router).toContain("localization: commercialCatalogLocalizationRouter");

    const dual = read(
      "client/src/components/commercial/CommercialDualPrice.tsx"
    );
    expect(dual).toContain("commercial-dual-price");

    const pricing = read("client/src/pages/Pricing.tsx");
    expect(pricing).toContain("CommercialDualPrice");
    expect(pricing).toContain("resolveVisitorContext");
  });
});
