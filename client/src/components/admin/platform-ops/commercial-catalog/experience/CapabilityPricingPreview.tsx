/**
 * COMMERCIAL-CAPABILITY-EXPERIENCE-1
 * Pricing-shaped preview — mirrors public Pricing presentation structure.
 * Presentation only; does not call Catalog mutations.
 */

import { Check } from "lucide-react";
import {
  PlatformOpsStatusBadge,
} from "@/design-system/platform-ops-ui";
import {
  SemanticSurfaceCard,
  SemanticSurfaceCardContent,
  SemanticSurfaceCardDescription,
  SemanticSurfaceCardHeader,
  SemanticSurfaceCardTitle,
} from "@/design-system/semantic-card";
import { useCatalogI18n } from "../useCatalogI18n";
import {
  catalogFeatureNameKey,
  resolveCatalogLabel,
  yearlySavingsPercent,
} from "../catalogCommercialDisplay";
import {
  groupCapabilitiesByExperienceDomain,
  listCapabilityExperienceCards,
} from "./capabilityExperienceModel";
import { cn } from "@/lib/utils";

export type CapabilityPricingPreviewProps = {
  planName: string;
  versionLabel?: string;
  monthlyAmount: string;
  yearlyAmount: string;
  currency?: string;
  /** featureKey → enabled */
  enabledFeatures: Record<string, boolean>;
  cycle?: "monthly" | "yearly";
  onCycleChange?: (cycle: "monthly" | "yearly") => void;
  className?: string;
};

export function CapabilityPricingPreview({
  planName,
  versionLabel,
  monthlyAmount,
  yearlyAmount,
  currency = "USD",
  enabledFeatures,
  cycle = "yearly",
  onCycleChange,
  className,
}: CapabilityPricingPreviewProps) {
  const { cc, t, language } = useCatalogI18n();
  const price = cycle === "yearly" ? yearlyAmount : monthlyAmount;
  const savings = yearlySavingsPercent(
    Number(monthlyAmount),
    Number(yearlyAmount)
  );

  const enabledCards = listCapabilityExperienceCards().filter(
    (c) => enabledFeatures[c.filterKey]
  );
  const groups = groupCapabilitiesByExperienceDomain(enabledCards);

  return (
    <div
      className={cn("space-y-3", className)}
      data-slot="capability-pricing-preview"
      data-program="COMMERCIAL-CAPABILITY-EXPERIENCE-1"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {cc("capabilityExperience.pricingPreview.eyebrow")}
      </p>
      {onCycleChange ? (
        <div className="flex w-fit rounded border p-1">
          <button
            type="button"
            className={cn(
              "rounded px-3 py-1 text-sm",
              cycle === "monthly" ? "bg-primary text-primary-foreground" : undefined
            )}
            onClick={() => onCycleChange("monthly")}
          >
            {cc("preview.monthly")}
          </button>
          <button
            type="button"
            className={cn(
              "rounded px-3 py-1 text-sm",
              cycle === "yearly" ? "bg-primary text-primary-foreground" : undefined
            )}
            onClick={() => onCycleChange("yearly")}
          >
            {cc("preview.yearly")}
          </button>
        </div>
      ) : null}

      <SemanticSurfaceCard cardType="feature" className="max-w-md border-2">
        <SemanticSurfaceCardHeader className="space-y-2 p-6 pb-2">
          <div className="flex items-start justify-between gap-2">
            <SemanticSurfaceCardTitle className="text-xl">
              {planName}
            </SemanticSurfaceCardTitle>
            <PlatformOpsStatusBadge
              status="info"
              label={cc("capabilityExperience.pricingPreview.publicCard")}
            />
          </div>
          {versionLabel ? (
            <SemanticSurfaceCardDescription>
              {versionLabel}
            </SemanticSurfaceCardDescription>
          ) : null}
          <p className="text-3xl font-bold tracking-tight">
            {currency === "USD" ? "$" : `${currency} `}
            {price || "0"}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              /{" "}
              {cycle === "yearly"
                ? cc("preview.yearly")
                : cc("preview.monthly")}
            </span>
          </p>
          {cycle === "yearly" && savings != null ? (
            <p className="text-sm font-medium text-orange-600 dark:text-orange-300">
              {cc("polish.savings").replace("{percent}", String(savings))}
            </p>
          ) : null}
        </SemanticSurfaceCardHeader>
        <SemanticSurfaceCardContent className="space-y-3 p-6 pt-2">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {cc("capabilityExperience.pricingPreview.noCapabilities")}
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.domainId}>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">
                  {cc(`capabilityExperience.domains.${g.domainId}`)}
                </p>
                <ul className="space-y-1.5">
                  {g.capabilities.map((c) => (
                    <li
                      key={c.filterKey}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Check className="h-4 w-4 shrink-0 text-cyan-600" />
                      {resolveCatalogLabel(
                        t,
                        catalogFeatureNameKey(c.filterKey),
                        c.filterKey
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
          <p className="text-xs text-muted-foreground">
            {cc("capabilityExperience.pricingPreview.matchesPublic")}
          </p>
        </SemanticSurfaceCardContent>
      </SemanticSurfaceCard>
    </div>
  );
}
