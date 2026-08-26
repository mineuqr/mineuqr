/**
 * COMMERCIAL-CAPABILITY-EXPERIENCE-1 + COMMERCIAL-CATALOG-RATIONALIZATION-1
 * Capability Filter picker — customer-oriented commercial presentation.
 * Persists Projection keys only; presentation overlay applies AA rules.
 */

import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlatformOpsMetricCard,
  PlatformOpsMetricGrid,
  PlatformOpsStatusBadge,
} from "@/design-system/platform-ops-ui";
import {
  SemanticSurfaceCard,
  SemanticSurfaceCardContent,
  SemanticSurfaceCardDescription,
  SemanticSurfaceCardHeader,
  SemanticSurfaceCardTitle,
} from "@/design-system/semantic-card";
import { translateIn } from "@/contexts/LanguageContext";
import { useCatalogI18n } from "../useCatalogI18n";
import { resolveCatalogLabel } from "../catalogCommercialDisplay";
import {
  presentationDescriptionI18nKey,
  presentationDetailI18nKey,
  presentationNameI18nKey,
} from "@shared/commercial-catalog-presentation";
import {
  CAPABILITY_EXPERIENCE_DOMAIN_ORDER,
  applyPickerChange,
  countEnabledCapabilities,
  groupCapabilitiesByExperienceDomain,
  isPresentationCardEnabled,
  listCapabilityExperienceCards,
  normalizePlanFeatures,
  type CapabilityExperienceDomainId,
} from "./capabilityExperienceModel";
import { cn } from "@/lib/utils";

export type CapabilityFilterPickerProps = {
  value: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
  className?: string;
  compact?: boolean;
};

export function CapabilityFilterPicker({
  value,
  onChange,
  className,
  compact = false,
}: CapabilityFilterPickerProps) {
  const { cc, t, language } = useCatalogI18n();
  const [query, setQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [showRegistryKeys, setShowRegistryKeys] = useState(false);

  const features = useMemo(() => normalizePlanFeatures(value), [value]);
  const counts = useMemo(() => countEnabledCapabilities(features), [features]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cards = listCapabilityExperienceCards().filter((card) => {
      if (domainFilter !== "all" && card.experienceDomain !== domainFilter) {
        return false;
      }
      if (!q) return true;
      const nameAr = translateIn(
        "ar",
        presentationNameI18nKey(card.presentationId)
      ).toLowerCase();
      const nameEn = translateIn(
        "en",
        presentationNameI18nKey(card.presentationId)
      ).toLowerCase();
      const desc = t(
        presentationDescriptionI18nKey(card.presentationId)
      ).toLowerCase();
      return (
        nameAr.includes(q) ||
        nameEn.includes(q) ||
        desc.includes(q) ||
        card.presentationId.toLowerCase().includes(q) ||
        card.projectionKeys.some((k) => k.toLowerCase().includes(q))
      );
    });
    return groupCapabilitiesByExperienceDomain(cards);
  }, [query, domainFilter, t]);

  function setPresentation(presentationId: string, enabled: boolean) {
    onChange(applyPickerChange(features, presentationId, enabled));
  }

  function bulk(enable: boolean, presentationIds: string[]) {
    let next = { ...features };
    for (const id of presentationIds) {
      next = applyPickerChange(next, id, enable);
    }
    onChange(next);
  }

  function domainLabel(id: CapabilityExperienceDomainId) {
    return cc(`capabilityExperience.domains.${id}`);
  }

  return (
    <div
      className={cn("space-y-4", className)}
      data-program="COMMERCIAL-CATALOG-RATIONALIZATION-1"
      data-slot="capability-filter-picker"
    >
      <PlatformOpsMetricGrid>
        <PlatformOpsMetricCard
          label={cc("capabilityExperience.metrics.total")}
          value={String(counts.total)}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("capabilityExperience.metrics.enabled")}
          value={String(counts.enabled)}
          tone="success"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={cc("capabilityExperience.metrics.disabled")}
          value={String(counts.disabled)}
          tone="warning"
          domain="information"
        />
      </PlatformOpsMetricGrid>

      <p className="text-sm text-muted-foreground">
        {cc("capabilityExperience.filterMetaphor")}
      </p>
      <p className="text-xs text-muted-foreground">
        {cc("capabilityExperience.foundationNote")}
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={cc("capabilityExperience.searchPlaceholder")}
            aria-label={cc("capabilityExperience.searchPlaceholder")}
          />
        </div>
        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="w-48">
            <SelectValue
              placeholder={cc("capabilityExperience.allDomains")}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {cc("capabilityExperience.allDomains")}
            </SelectItem>
            {CAPABILITY_EXPERIENCE_DOMAIN_ORDER.map((id) => (
              <SelectItem key={id} value={id}>
                {domainLabel(id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            bulk(
              true,
              groups.flatMap((g) =>
                g.capabilities
                  .filter((c) => !c.alwaysEnabled)
                  .map((c) => c.presentationId)
              )
            )
          }
        >
          {cc("capabilityExperience.bulkEnableVisible")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            bulk(
              false,
              groups.flatMap((g) =>
                g.capabilities
                  .filter((c) => !c.alwaysEnabled)
                  .map((c) => c.presentationId)
              )
            )
          }
        >
          {cc("capabilityExperience.bulkDisableVisible")}
        </Button>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={showRegistryKeys}
            onCheckedChange={(c) => setShowRegistryKeys(Boolean(c))}
          />
          {cc("capabilityExperience.showRegistryKeys")}
        </label>
      </div>

      <div
        className={cn(
          "space-y-4 overflow-y-auto pr-1",
          compact ? "max-h-64" : "max-h-[28rem]"
        )}
      >
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {cc("capabilityExperience.noMatches")}
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.domainId} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold tracking-tight">
                  {domainLabel(group.domainId)}
                </h4>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      bulk(
                        true,
                        group.capabilities
                          .filter((c) => !c.alwaysEnabled)
                          .map((c) => c.presentationId)
                      )
                    }
                  >
                    {cc("capabilityExperience.enableDomain")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      bulk(
                        false,
                        group.capabilities
                          .filter((c) => !c.alwaysEnabled)
                          .map((c) => c.presentationId)
                      )
                    }
                  >
                    {cc("capabilityExperience.disableDomain")}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.capabilities.map((card) => {
                  const enabled = isPresentationCardEnabled(card, features);
                  const locked = card.alwaysEnabled;
                  const nameAr = translateIn(
                    "ar",
                    presentationNameI18nKey(card.presentationId)
                  );
                  const nameEn = translateIn(
                    "en",
                    presentationNameI18nKey(card.presentationId)
                  );
                  const name = language === "ar" ? nameAr : nameEn;
                  const description = resolveCatalogLabel(
                    t,
                    presentationDescriptionI18nKey(card.presentationId),
                    cc("capabilityExperience.defaultDescription")
                  );
                  const details = card.detailProjectionKeys ?? [];
                  const identity =
                    card.projectionKeys.join(", ") || card.presentationId;
                  return (
                    <SemanticSurfaceCard
                      key={card.presentationId}
                      cardType="feature"
                      className={cn(
                        "transition-colors",
                        enabled ? "border-primary/40 bg-primary/5" : undefined
                      )}
                    >
                      <SemanticSurfaceCardHeader className="space-y-1 p-3 pb-1">
                        <div className="flex items-start justify-between gap-2">
                          <SemanticSurfaceCardTitle className="text-sm">
                            <span className="block">{nameAr}</span>
                            <span className="block text-[11px] font-normal text-muted-foreground">
                              {nameEn}
                            </span>
                          </SemanticSurfaceCardTitle>
                          <Checkbox
                            checked={enabled}
                            disabled={locked}
                            onCheckedChange={(c) =>
                              setPresentation(
                                card.presentationId,
                                Boolean(c)
                              )
                            }
                            aria-label={name}
                          />
                        </div>
                        <SemanticSurfaceCardDescription className="text-xs">
                          {description}
                        </SemanticSurfaceCardDescription>
                        {locked ? (
                          <p className="text-[11px] text-muted-foreground">
                            {card.projectionKeys.length === 0
                              ? cc("capabilityExperience.alwaysOnProductNote")
                              : cc("capabilityExperience.foundationNote")}
                          </p>
                        ) : null}
                      </SemanticSurfaceCardHeader>
                      <SemanticSurfaceCardContent className="space-y-2 p-3 pt-0">
                        {details.length > 0 ? (
                          <ul className="list-inside list-disc text-[11px] text-muted-foreground">
                            {details.map((detailKey) => (
                              <li key={detailKey}>
                                {resolveCatalogLabel(
                                  t,
                                  presentationDetailI18nKey(
                                    "financialSettlement",
                                    detailKey
                                  ),
                                  detailKey
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <div className="flex flex-wrap gap-1">
                          <PlatformOpsStatusBadge
                            status="healthy"
                            label={cc(
                              card.class === "commercial"
                                ? "capabilityExperience.commercializable"
                                : "capabilityExperience.foundationBadge"
                            )}
                          />
                          {locked ? (
                            <PlatformOpsStatusBadge
                              status="unknown"
                              label={cc("capabilityExperience.alwaysIncluded")}
                            />
                          ) : (
                            <PlatformOpsStatusBadge
                              status={enabled ? "healthy" : "warning"}
                              label={
                                enabled
                                  ? cc("capabilityExperience.enabled")
                                  : cc("capabilityExperience.disabled")
                              }
                            />
                          )}
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {identity}
                          </span>
                          {showRegistryKeys &&
                          identity !== card.presentationId ? (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {card.presentationId}
                            </span>
                          ) : null}
                        </div>
                      </SemanticSurfaceCardContent>
                    </SemanticSurfaceCard>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
