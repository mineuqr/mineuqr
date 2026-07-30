/**
 * COMMERCIAL-CAPABILITY-EXPERIENCE-1
 * Capability Filter picker — domain-grouped, searchable, bulk enable/disable.
 * Presentation only — controlled value mirrors prior checkbox Record.
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
import { useCatalogI18n } from "../useCatalogI18n";
import {
  catalogFeatureDescriptionKey,
  catalogFeatureNameKey,
  resolveCatalogLabel,
} from "../catalogCommercialDisplay";
import {
  CAPABILITY_EXPERIENCE_DOMAIN_ORDER,
  countEnabledCapabilities,
  groupCapabilitiesByExperienceDomain,
  listCapabilityExperienceCards,
  type CapabilityExperienceDomainId,
} from "./capabilityExperienceModel";
import { cn } from "@/lib/utils";

export type CapabilityFilterPickerProps = {
  value: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
  className?: string;
  /** Compact mode for dialogs */
  compact?: boolean;
};

export function CapabilityFilterPicker({
  value,
  onChange,
  className,
  compact = false,
}: CapabilityFilterPickerProps) {
  const { cc, t } = useCatalogI18n();
  const [query, setQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [showRegistryKeys, setShowRegistryKeys] = useState(false);

  const counts = useMemo(() => countEnabledCapabilities(value), [value]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cards = listCapabilityExperienceCards().filter((card) => {
      if (domainFilter !== "all" && card.experienceDomain !== domainFilter) {
        return false;
      }
      if (!q) return true;
      const name = resolveCatalogLabel(
        t,
        catalogFeatureNameKey(card.filterKey),
        card.filterKey
      ).toLowerCase();
      const desc = t(catalogFeatureDescriptionKey(card.filterKey)).toLowerCase();
      return (
        name.includes(q) ||
        desc.includes(q) ||
        card.filterKey.toLowerCase().includes(q) ||
        card.ownerDomain.toLowerCase().includes(q)
      );
    });
    return groupCapabilitiesByExperienceDomain(cards);
  }, [query, domainFilter, t]);

  function setKey(key: string, enabled: boolean) {
    onChange({ ...value, [key]: enabled });
  }

  function bulk(enable: boolean, keys: string[]) {
    const next = { ...value };
    for (const k of keys) next[k] = enable;
    onChange(next);
  }

  function domainLabel(id: CapabilityExperienceDomainId) {
    return cc(`capabilityExperience.domains.${id}`);
  }

  return (
    <div
      className={cn("space-y-4", className)}
      data-program="COMMERCIAL-CAPABILITY-EXPERIENCE-1"
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
          tone="healthy"
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
              groups.flatMap((g) => g.capabilities.map((c) => c.filterKey))
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
              groups.flatMap((g) => g.capabilities.map((c) => c.filterKey))
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
                        group.capabilities.map((c) => c.filterKey)
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
                        group.capabilities.map((c) => c.filterKey)
                      )
                    }
                  >
                    {cc("capabilityExperience.disableDomain")}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.capabilities.map((card) => {
                  const enabled = Boolean(value[card.filterKey]);
                  const name = resolveCatalogLabel(
                    t,
                    catalogFeatureNameKey(card.filterKey),
                    card.filterKey
                  );
                  const description = resolveCatalogLabel(
                    t,
                    catalogFeatureDescriptionKey(card.filterKey),
                    cc("capabilityExperience.defaultDescription")
                  );
                  return (
                    <SemanticSurfaceCard
                      key={card.filterKey}
                      cardType="feature"
                      className={cn(
                        "transition-colors",
                        enabled ? "border-primary/40 bg-primary/5" : undefined
                      )}
                    >
                      <SemanticSurfaceCardHeader className="space-y-1 p-3 pb-1">
                        <div className="flex items-start justify-between gap-2">
                          <SemanticSurfaceCardTitle className="text-sm">
                            {name}
                          </SemanticSurfaceCardTitle>
                          <Checkbox
                            checked={enabled}
                            onCheckedChange={(c) =>
                              setKey(card.filterKey, Boolean(c))
                            }
                            aria-label={name}
                          />
                        </div>
                        <SemanticSurfaceCardDescription className="text-xs">
                          {description}
                        </SemanticSurfaceCardDescription>
                      </SemanticSurfaceCardHeader>
                      <SemanticSurfaceCardContent className="flex flex-wrap gap-1 p-3 pt-0">
                        <PlatformOpsStatusBadge
                          status="unknown"
                          label={card.ownerDomain}
                        />
                        <PlatformOpsStatusBadge
                          status="healthy"
                          label={cc(
                            "capabilityExperience.commercializable"
                          )}
                        />
                        <PlatformOpsStatusBadge
                          status={enabled ? "healthy" : "warning"}
                          label={
                            enabled
                              ? cc("capabilityExperience.enabled")
                              : cc("capabilityExperience.disabled")
                          }
                        />
                        {showRegistryKeys ? (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {card.filterKey}
                          </span>
                        ) : null}
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
