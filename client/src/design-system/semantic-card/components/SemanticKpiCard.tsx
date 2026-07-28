/**
 * SEMANTIC-CARD-DESIGN-SYSTEM-1
 * Platform-reusable KPI / summary / compact card.
 * Presentation only — values and labels come from callers (KPI registry / VMs).
 */
import type { ComponentType } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { semanticPanel } from "../tokens/panel";
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
  valueVariant?: SemanticValueVariant;
  emphasis?: SemanticCardEmphasis;
  hint?: string;
  loading?: boolean;
  className?: string;
  /** Isolate numbers in LTR for RTL layouts. */
  valueDir?: "ltr" | "rtl" | "auto";
  valueClassName?: string;
};

function resolveTone(tone: SemanticKpiCardProps["tone"]): SemanticTone {
  if (!tone) return "neutral";
  return legacyToneToSemanticTone(tone);
}

function shellForEmphasis(emphasis: SemanticCardEmphasis): string {
  if (emphasis === "primary") return semanticPanel.kpiPrimary;
  if (emphasis === "supporting") return semanticPanel.kpiSupporting;
  return semanticPanel.kpi;
}

function valueClassFor(
  valueVariant: SemanticValueVariant,
  emphasis: SemanticCardEmphasis
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
  valueVariant = "operational",
  emphasis = "secondary",
  hint,
  loading = false,
  className,
  valueDir = "ltr",
  valueClassName,
}: SemanticKpiCardProps) {
  const semanticTone = resolveTone(tone);
  const compact = emphasis === "compact";
  const primary = emphasis === "primary";

  return (
    <Card className={cn(shellForEmphasis(emphasis), className)}>
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-between space-y-0",
          compact
            ? "px-3 pb-1 pt-3"
            : primary
              ? "px-4 pb-1 pt-4 sm:px-5 sm:pt-5"
              : "px-3 pb-1 pt-3 sm:px-4 sm:pt-4"
        )}
      >
        <CardTitle
          className={cn(
            "font-medium leading-tight text-slate-400",
            compact
              ? "text-[11px] leading-tight"
              : primary
                ? "text-xs sm:text-sm"
                : "text-[11px] sm:text-xs",
            emphasis === "supporting" && "text-slate-500"
          )}
        >
          {label}
        </CardTitle>
        <Icon
          className={cn(
            "shrink-0",
            compact
              ? "h-3.5 w-3.5 text-cyan-400"
              : primary
                ? "h-4 w-4 sm:h-5 sm:w-5"
                : "h-3.5 w-3.5 sm:h-4 sm:w-4",
            !compact && semanticToneIconClass(semanticTone)
          )}
          aria-hidden
        />
      </CardHeader>
      <CardContent
        className={cn(
          compact
            ? "px-3 pb-3"
            : primary
              ? "px-4 pb-4 sm:px-5 sm:pb-5"
              : "px-3 pb-3 sm:px-4 sm:pb-4"
        )}
      >
        {loading ? (
          <Skeleton
            className={compact ? "h-7 w-16" : "h-7 w-16 sm:h-8 sm:w-20"}
          />
        ) : (
          <div
            dir={valueDir}
            className={cn(
              "text-end font-bold tabular-nums sm:text-start",
              compact
                ? "text-lg text-white sm:text-xl"
                : emphasis !== "primary" && "text-lg sm:text-xl",
              !valueClassName && valueClassFor(valueVariant, emphasis),
              valueClassName
            )}
          >
            {value}
          </div>
        )}
        {hint ? (
          <p
            className={cn(
              "mt-0.5 leading-tight",
              compact
                ? "text-[10px] text-cyan-300/80"
                : primary
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
