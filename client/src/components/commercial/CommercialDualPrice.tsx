/**
 * COMMERCIAL-CATALOG-LOCALIZATION-IMPLEMENTATION-1
 * Dual currency presentation atom (USD + local).
 */

import { useLanguage } from "@/contexts/LanguageContext";
import {
  formatCommercialCurrency,
  localeFromLanguage,
  type DualPricePresentation,
} from "@shared/commercial-catalog";
import { cn } from "@/lib/utils";

export function CommercialDualPrice(props: {
  presentation: DualPricePresentation;
  cycleLabel?: string;
  className?: string;
  showSource?: boolean;
}) {
  const { t, language } = useLanguage();
  const locale = localeFromLanguage(language);
  const p = props.presentation;
  const sourceLabel =
    p.currencySource === "regional_override"
      ? t("admin.platformOps.commercialCatalog.money.sourceRegional")
      : p.currencySource === "fx"
        ? t("admin.platformOps.commercialCatalog.money.sourceFx")
        : t("admin.platformOps.commercialCatalog.money.sourceUsd");

  return (
    <div
      data-slot="commercial-dual-price"
      className={cn("space-y-2", props.className)}
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("admin.platformOps.commercialCatalog.money.canonicalUsd")}
        </div>
        <div className="text-2xl font-bold tabular-nums">
          {formatCommercialCurrency(
            p.canonicalAmount,
            p.canonicalCurrency,
            locale
          )}
          {props.cycleLabel ? (
            <span className="ms-1 text-sm font-normal text-muted-foreground">
              / {props.cycleLabel}
            </span>
          ) : null}
        </div>
      </div>
      <div className="border-t pt-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("admin.platformOps.commercialCatalog.money.localCurrency")}
        </div>
        <div className="text-lg font-semibold tabular-nums">
          {p.localIsApproximate ? "≈ " : null}
          {formatCommercialCurrency(p.localAmount, p.localCurrency, locale)}
          {props.cycleLabel ? (
            <span className="ms-1 text-sm font-normal text-muted-foreground">
              / {props.cycleLabel}
            </span>
          ) : null}
        </div>
      </div>
      {props.showSource !== false ? (
        <p className="text-xs text-muted-foreground">{sourceLabel}</p>
      ) : null}
    </div>
  );
}
