/**
 * COMMERCIAL-CATALOG-LOCALIZATION-IMPLEMENTATION-1
 * Admin read-only multi-market localized price preview.
 */

import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ADMIN_LOCALIZATION_PREVIEW_MARKETS,
  formatCommercialCurrency,
  getFxService,
  localeFromLanguage,
  resolveDualPricePresentation,
  type PriceRowInput,
  type RegionRowInput,
} from "@shared/commercial-catalog";
import { CommercialDualPrice } from "@/components/commercial/CommercialDualPrice";
import { PlatformOpsSection } from "@/design-system/platform-ops-ui";

const MARKET_NAME_KEYS: Record<string, string> = {
  SA: "admin.platformOps.commercialCatalog.markets.sa",
  DE: "admin.platformOps.commercialCatalog.markets.de",
  US: "admin.platformOps.commercialCatalog.markets.us",
  JP: "admin.platformOps.commercialCatalog.markets.jp",
  GB: "admin.platformOps.commercialCatalog.markets.gb",
};

export function AdminLocalizedPricePreview(props: {
  prices: PriceRowInput[];
  regions: RegionRowInput[];
}) {
  const { t, language } = useLanguage();
  const locale = localeFromLanguage(language);
  const fx = useMemo(() => getFxService(), []);

  const markets = useMemo(() => {
    return ADMIN_LOCALIZATION_PREVIEW_MARKETS.map((m) => {
      const presentation = resolveDualPricePresentation({
        prices: props.prices,
        regions: props.regions,
        countryCode: m.countryCode,
        convert: (amount, from, to) => fx.convertSync(amount, from, to),
      });
      return { ...m, presentation };
    });
  }, [props.prices, props.regions, fx]);

  if (props.prices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("admin.platformOps.commercialCatalog.money.previewEmpty")}
      </p>
    );
  }

  return (
    <PlatformOpsSection
      title={t("admin.platformOps.commercialCatalog.money.adminPreviewTitle")}
      description={t(
        "admin.platformOps.commercialCatalog.money.adminPreviewBody"
      )}
    >
      <div className="mb-3 text-sm">
        <span className="text-muted-foreground">
          {t("admin.platformOps.commercialCatalog.money.canonicalUsd")}:{" "}
        </span>
        <span className="font-semibold tabular-nums">
          {formatCommercialCurrency(
            markets[0]?.presentation.canonicalAmount ?? "0",
            "USD",
            locale
          )}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {markets.map((m) => (
          <div
            key={m.countryCode}
            className="rounded-xl border bg-card/40 p-4"
            data-slot="admin-market-preview"
          >
            <div className="mb-2 font-medium">
              {t(MARKET_NAME_KEYS[m.countryCode] ?? m.labelKey)}
            </div>
            <CommercialDualPrice
              presentation={m.presentation}
              showSource
            />
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("admin.platformOps.commercialCatalog.money.previewReadOnly")}
      </p>
    </PlatformOpsSection>
  );
}
