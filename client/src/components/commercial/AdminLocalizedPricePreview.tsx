/**
 * COMMERCIAL-CATALOG-LOCALIZATION-IMPLEMENTATION-1
 * COMMERCIAL-CATALOG-PRODUCTION-POLISH-1 — monthly/yearly admin market preview.
 */

import { useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { yearlySavingsPercent } from "@/components/admin/platform-ops/commercial-catalog/catalogCommercialDisplay";

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
  /** Optional billing-cycle ids to filter monthly vs yearly presentation. */
  monthlyBillingCycleIds?: string[];
  yearlyBillingCycleIds?: string[];
  priceCycleHints?: Array<{ billingCycleId?: string | null }>;
}) {
  const { t, language } = useLanguage();
  const locale = localeFromLanguage(language);
  const fx = useMemo(() => getFxService(), []);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");

  const filteredPrices = useMemo(() => {
    if (!props.priceCycleHints?.length) return props.prices;
    const ids =
      cycle === "monthly"
        ? new Set(props.monthlyBillingCycleIds ?? [])
        : new Set(props.yearlyBillingCycleIds ?? []);
    if (ids.size === 0) return props.prices;
    return props.prices.filter((_, i) => {
      const hint = props.priceCycleHints?.[i];
      return hint?.billingCycleId ? ids.has(hint.billingCycleId) : true;
    });
  }, [
    props.prices,
    props.priceCycleHints,
    props.monthlyBillingCycleIds,
    props.yearlyBillingCycleIds,
    cycle,
  ]);

  const markets = useMemo(() => {
    return ADMIN_LOCALIZATION_PREVIEW_MARKETS.map((m) => {
      const presentation = resolveDualPricePresentation({
        prices: filteredPrices,
        regions: props.regions,
        countryCode: m.countryCode,
        convert: (amount, from, to) => fx.convertSync(amount, from, to),
      });
      return { ...m, presentation };
    });
  }, [filteredPrices, props.regions, fx]);

  const monthlyIds = new Set(props.monthlyBillingCycleIds ?? []);
  const yearlyIds = new Set(props.yearlyBillingCycleIds ?? []);
  const usdRows = props.prices
    .map((p, i) => ({ p, hint: props.priceCycleHints?.[i] }))
    .filter(({ p }) => p.currency.toUpperCase() === "USD" && !p.regionId);
  const monthlyUsd = Number(
    (
      usdRows.find(({ hint }) =>
        hint?.billingCycleId ? monthlyIds.has(hint.billingCycleId) : false
      ) ?? usdRows[0]
    )?.p.amount ?? 0
  );
  const yearlyUsd = Number(
    (
      usdRows.find(({ hint }) =>
        hint?.billingCycleId ? yearlyIds.has(hint.billingCycleId) : false
      ) ?? usdRows[1] ?? usdRows[0]
    )?.p.amount ?? monthlyUsd
  );
  const savings = yearlySavingsPercent(monthlyUsd, yearlyUsd);

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
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {t("admin.platformOps.commercialCatalog.polish.previewCycle")}
        </span>
        <Button
          type="button"
          size="sm"
          variant={cycle === "monthly" ? "default" : "outline"}
          onClick={() => setCycle("monthly")}
        >
          {t("admin.platformOps.commercialCatalog.preview.monthly")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={cycle === "yearly" ? "default" : "outline"}
          onClick={() => setCycle("yearly")}
        >
          {t("admin.platformOps.commercialCatalog.preview.yearly")}
        </Button>
        {savings != null ? (
          <span className="text-xs font-medium text-muted-foreground">
            {t("admin.platformOps.commercialCatalog.polish.savings").replace(
              "{percent}",
              String(savings)
            )}
          </span>
        ) : null}
      </div>
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
            <CommercialDualPrice presentation={m.presentation} showSource />
            <p className="mt-2 text-[11px] text-muted-foreground">
              {m.presentation.currencySource === "regional_override"
                ? t("admin.platformOps.commercialCatalog.polish.overrideSource")
                : t("admin.platformOps.commercialCatalog.polish.fxSource")}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("admin.platformOps.commercialCatalog.money.previewReadOnly")}
      </p>
    </PlatformOpsSection>
  );
}
