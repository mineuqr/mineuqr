/**
 * SEMANTIC-CARD-DESIGN-SYSTEM-1
 * Restaurant KPI card — compatibility wrapper over SemanticKpiCard.
 * Prefer importing SemanticKpiCard for new platform surfaces.
 */
import type { ComponentType } from "react";
import {
  SemanticKpiCard,
  SemanticKpiSkeleton,
  type SemanticCardEmphasis,
  type SemanticTone,
  type SemanticValueVariant,
} from "@/design-system/semantic-card";
import { restaurantDash } from "./restaurantDashStyles";

/** @deprecated Prefer SemanticTone from design-system */
export type RestaurantKpiTone = SemanticTone;
/** @deprecated Prefer SemanticValueVariant from design-system */
export type RestaurantKpiValueVariant = SemanticValueVariant;
export type RestaurantKpiEmphasis = Exclude<SemanticCardEmphasis, "compact">;

type RestaurantKpiCardProps = {
  label: string;
  value: number | string;
  icon: ComponentType<{ className?: string }>;
  tone?: SemanticTone | "default" | "primary" | "accent" | "emerald" | "amber";
  valueVariant?: SemanticValueVariant;
  emphasis?: RestaurantKpiEmphasis;
  hint?: string;
  loading?: boolean;
  className?: string;
};

export function RestaurantKpiCard(props: RestaurantKpiCardProps) {
  return <SemanticKpiCard {...props} emphasis={props.emphasis ?? "secondary"} />;
}

export function RestaurantKpiGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <SemanticKpiSkeleton count={count} gridClassName={restaurantDash.kpiGrid} />
  );
}
