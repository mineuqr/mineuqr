/**
 * SEMANTIC-CARD-DESIGN-SYSTEM-1 + SEMANTIC-CARD-VISUAL-CONSISTENCY-1
 * + SEMANTIC-CARD-PREMIUM-INTERACTION-1
 * + SEMANTIC-DOMAIN-COLOR-ADOPTION-1
 * Platform-reusable KPI card — Reporting golden visual language.
 * Presentation only — values and labels come from callers.
 *
 * Visual rules:
 * - Secondary emphasis is the default golden chrome (padding, type, icon).
 * - Compact is an API alias of secondary (no separate visual language).
 * - Supporting is lighter shell weight only; same type/padding as secondary.
 * - Primary is reserved for rare hero KPIs (amber border); Reporting FlowStrip is preferred.
 * - `domain` applies soft border / ambient / icon identity (never floods the body).
 */
import type { ComponentType } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { semanticPanel } from "../tokens/panel";
import {
  SEMANTIC_ICON_HOVER,
  SEMANTIC_VALUE_HOVER,
} from "../tokens/interaction";
import {
  semanticDomainAccentClass,
  semanticDomainIconClass,
  semanticDomainToTone,
  type SemanticDomain,
} from "../tokens/domain";
import {
  legacyToneToSemanticTone,
  semanticToneIconClass,
  type SemanticTone,
} from "../tokens/semanticTone";
import { SEMANTIC_VALUE, type SemanticValueVariant } from "../tokens/value";

export type SemanticCardEmphasis = "primary" | "secondary" | "supporting" | "compact";

export type SemanticKpiCardProps = {
  label: string;
  value: number | string;
  icon: ComponentType<{ className?: string }>;
  tone?: SemanticTone | "default" | "primary" | "accent" | "emerald" | "amber";
  /**
   * Business domain identity — soft border / ambient / icon.
   * When set, owns icon color; tone remains for status semantics if needed.
   */
  domain?: SemanticDomain;
  valueVariant?: SemanticValueVariant;
  emphasis?: SemanticCardEmphasis;
  hint?: string;
  loading?: boolean;
  /** Layout-only (e.g. col-span). Do not use for padding/radius/typography forks. */
  className?: string;
  /** Isolate numbers in LTR for RTL layouts. */
  valueDir?: "ltr" | "rtl" | "auto";
};

function resolveTone(
  tone: SemanticKpiCardProps["tone"],
  domain?: SemanticDomain
): SemanticTone {
  if (domain && (tone == null || tone === "neutral" || tone === "default")) {
    return semanticDomainToTone(domain);
  }
  if (!tone) return domain ? semanticDomainToTone(domain) : "neutral";
  return legacyToneToSemanticTone(tone);
}

function resolveEmphasis(emphasis: SemanticCardEmphasis): Exclude<SemanticCardEmphasis, "compact"> {
  // VISUAL-CONSISTENCY-1 — compact aliases secondary (Reporting golden).
  if (emphasis === "compact") return "secondary";
  return emphasis;
}

function shellForEmphasis(emphasis: Exclude<SemanticCardEmphasis, "compact">): string {
  if (emphasis === "primary") return semanticPanel.kpiPrimary;
  if (emphasis === "supporting") return semanticPanel.kpiSupporting;
  return semanticPanel.kpi;
}

function valueClassFor(
  valueVariant: SemanticValueVariant,
  emphasis: Exclude<SemanticCardEmphasis, "compact">
): string {
  if (valueVariant === "revenue") {
    return emphasis === "primary"
      ? SEMANTIC_VALUE.revenuePrimary
      : SEMANTIC_VALUE.revenue;
  }
  return cn(
    SEMANTIC_VALUE.operational,
    emphasis === "primary" && "text-2xl sm:text-3xl"
  );
}

export function SemanticKpiCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  domain,
  valueVariant = "operational",
  emphasis = "secondary",
  hint,
  loading = false,
  className,
  valueDir = "ltr",
}: SemanticKpiCardProps) {
  const semanticTone = resolveTone(tone, domain);
  const visual = resolveEmphasis(emphasis);
  const primary = visual === "primary";
  const iconClass = domain
    ? semanticDomainIconClass(domain)
    : semanticToneIconClass(semanticTone);

  return (
    <Card
      data-slot="semantic-kpi-card"
      data-emphasis={visual}
      data-domain={domain}
      className={cn(
        shellForEmphasis(visual),
        // Soft domain accent — skip primary (amber hero owns border).
        domain && !primary && semanticDomainAccentClass(domain),
        className
      )}
    >
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-between gap-0 space-y-0",
          primary
            ? "px-4 pb-1 pt-4 sm:px-5 sm:pt-5"
            : "px-3 pb-1 pt-3 sm:px-4 sm:pt-4"
        )}
      >
        <CardTitle
          className={cn(
            "font-medium leading-tight",
            primary ? "text-xs sm:text-sm text-slate-400" : "text-[11px] sm:text-xs",
            visual === "supporting" ? "text-slate-500" : "text-slate-400"
          )}
        >
          {label}
        </CardTitle>
        <Icon
          className={cn(
            "shrink-0 origin-center",
            primary ? "h-4 w-4 sm:h-5 sm:w-5" : "h-3.5 w-3.5 sm:h-4 sm:w-4",
            iconClass,
            SEMANTIC_ICON_HOVER
          )}
          aria-hidden
        />
      </CardHeader>
      <CardContent
        className={cn(
          primary ? "px-4 pb-4 sm:px-5 sm:pb-5" : "px-3 pb-3 sm:px-4 sm:pb-4"
        )}
      >
        {loading ? (
          <Skeleton className="h-7 w-16 sm:h-8 sm:w-20" />
        ) : (
          <div
            dir={valueDir}
            className={cn(
              "text-end font-bold tabular-nums sm:text-start",
              !primary && "text-lg sm:text-xl",
              valueClassFor(valueVariant, visual),
              SEMANTIC_VALUE_HOVER
            )}
          >
            {value}
          </div>
        )}
        {hint ? (
          <p
            className={cn(
              "mt-0.5 leading-tight",
              primary
                ? "text-xs text-slate-400 sm:text-sm"
                : "text-[10px] text-slate-500 sm:text-xs"
            )}
          >
            {hint}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
