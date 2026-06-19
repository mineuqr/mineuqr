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
  type RestaurantKpiTone,
  type RestaurantKpiValueVariant,
} from "./restaurantDashStyles";

type RestaurantKpiCardProps = {
  label: string;
  value: number | string;
  icon: ComponentType<{ className?: string }>;
  tone?: RestaurantKpiTone | "default" | "primary" | "accent" | "emerald" | "amber";
  valueVariant?: RestaurantKpiValueVariant;
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

function valueClassName(valueVariant: RestaurantKpiValueVariant): string {
  return valueVariant === "revenue"
    ? restaurantRevenueValueClass
    : restaurantOperationalValueClass;
}

export function RestaurantKpiCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  valueVariant = "operational",
  hint,
  loading = false,
  className,
}: RestaurantKpiCardProps) {
  const semanticTone = resolveTone(tone);

  return (
    <Card className={cn(restaurantDash.kpiCard, className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 pb-1 pt-3 sm:px-4 sm:pt-4">
        <CardTitle className="text-[11px] font-medium leading-tight text-slate-400 sm:text-xs">
          {label}
        </CardTitle>
        <Icon
          className={cn("h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4", restaurantKpiIconClass(semanticTone))}
          aria-hidden
        />
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4">
        {loading ? (
          <Skeleton className="h-7 w-16 sm:h-8 sm:w-20" />
        ) : (
          <div
            dir="ltr"
            className={cn(
              "text-end text-lg font-bold tabular-nums sm:text-start sm:text-xl",
              valueClassName(valueVariant)
            )}
          >
            {value}
          </div>
        )}
        {hint ? (
          <p className="mt-0.5 text-[10px] leading-tight text-slate-500 sm:text-xs">{hint}</p>
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
