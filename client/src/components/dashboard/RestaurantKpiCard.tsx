import type { ComponentType } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  legacyToneToSemantic,
  restaurantDash,
  restaurantKpiIconClass,
  restaurantOperationalValueClass,
  restaurantRevenueValueClass,
  restaurantRevenueValueClassPrimary,
  type RestaurantKpiTone,
  type RestaurantKpiValueVariant,
} from "./restaurantDashStyles";

export type RestaurantKpiEmphasis = "primary" | "secondary" | "supporting";

type RestaurantKpiCardProps = {
  label: string;
  value: number | string;
  icon: ComponentType<{ className?: string }>;
  tone?: RestaurantKpiTone | "default" | "primary" | "accent" | "emerald" | "amber";
  valueVariant?: RestaurantKpiValueVariant;
  /** Visual hierarchy weight (REPORTING-VISUAL-HIERARCHY-1). */
  emphasis?: RestaurantKpiEmphasis;
  hint?: string;
  loading?: boolean;
  className?: string;
};

function resolveTone(
  tone: RestaurantKpiCardProps["tone"]
): RestaurantKpiTone {
  if (!tone || tone === "default") return "neutral";
  if (
    tone === "primary" ||
    tone === "accent" ||
    tone === "emerald" ||
    tone === "amber"
  ) {
    return legacyToneToSemantic(tone);
  }
  return tone;
}

function cardShell(emphasis: RestaurantKpiEmphasis): string {
  if (emphasis === "primary") return restaurantDash.kpiCardPrimary;
  if (emphasis === "supporting") return restaurantDash.kpiCardSupporting;
  return restaurantDash.kpiCardSecondary;
}

function valueClassName(
  valueVariant: RestaurantKpiValueVariant,
  emphasis: RestaurantKpiEmphasis
): string {
  if (valueVariant === "revenue") {
    return emphasis === "primary"
      ? restaurantRevenueValueClassPrimary
      : restaurantRevenueValueClass;
  }
  return cn(
    restaurantOperationalValueClass,
    emphasis === "primary" && "text-2xl sm:text-3xl"
  );
}

export function RestaurantKpiCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  valueVariant = "operational",
  emphasis = "secondary",
  hint,
  loading = false,
  className,
}: RestaurantKpiCardProps) {
  const semanticTone = resolveTone(tone);

  return (
    <Card className={cn(cardShell(emphasis), className)}>
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-between space-y-0",
          emphasis === "primary"
            ? "px-4 pb-1 pt-4 sm:px-5 sm:pt-5"
            : "px-3 pb-1 pt-3 sm:px-4 sm:pt-4"
        )}
      >
        <CardTitle
          className={cn(
            "font-medium leading-tight text-slate-400",
            emphasis === "primary"
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
            emphasis === "primary" ? "h-4 w-4 sm:h-5 sm:w-5" : "h-3.5 w-3.5 sm:h-4 sm:w-4",
            restaurantKpiIconClass(semanticTone)
          )}
          aria-hidden
        />
      </CardHeader>
      <CardContent
        className={cn(
          emphasis === "primary"
            ? "px-4 pb-4 sm:px-5 sm:pb-5"
            : "px-3 pb-3 sm:px-4 sm:pb-4"
        )}
      >
        {loading ? (
          <Skeleton className="h-7 w-16 sm:h-8 sm:w-20" />
        ) : (
          <div
            dir="ltr"
            className={cn(
              "text-end font-bold tabular-nums sm:text-start",
              emphasis !== "primary" && "text-lg sm:text-xl",
              valueClassName(valueVariant, emphasis)
            )}
          >
            {value}
          </div>
        )}
        {hint ? (
          <p
            className={cn(
              "mt-0.5 leading-tight",
              emphasis === "primary"
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

export function RestaurantKpiGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className={restaurantDash.kpiGrid}>
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} className={cn(restaurantDash.kpiCard, "animate-pulse")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 pb-1 pt-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <Skeleton className="h-7 w-14" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
