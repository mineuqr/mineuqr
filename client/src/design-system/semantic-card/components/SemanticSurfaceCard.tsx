/**
 * PLATFORM-CARD-DESIGN-SYSTEM-UNIFICATION-1
 * Canonical content-card shell — Landing / Dashboard visual language.
 *
 * Use for settings, feature, summary, analytics, navigation, action, etc.
 * KPI metrics → SemanticKpiCard. Executive category → SemanticExecutiveCard.
 * Empty → SemanticEmptyState (or cardType="empty").
 *
 * Presentation only — does not change layout structure of callers.
 */
import * as React from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  semanticCardTypeClass,
  type SemanticCardType,
  type SemanticCardTypeOptions,
} from "../tokens/cardType";
import type { SemanticDomain } from "../tokens/domain";

export type SemanticSurfaceCardProps = React.ComponentProps<"div"> & {
  /** Card type recipe — all inherit SEMANTIC_PANEL_BASE. */
  cardType?: SemanticCardType;
  /** Optional domain accent (Analytics, Payments, Kitchen, …). */
  domain?: SemanticDomain;
  /** Override default interactivity for the type. */
  interactive?: boolean;
};

export function SemanticSurfaceCard({
  cardType = "standard",
  domain,
  interactive,
  className,
  ...props
}: SemanticSurfaceCardProps) {
  const options: SemanticCardTypeOptions = { domain, interactive };

  return (
    <Card
      data-slot="semantic-surface-card"
      data-card-type={cardType}
      data-domain={domain}
      className={cn(semanticCardTypeClass(cardType, options), className)}
      {...props}
    />
  );
}

export {
  CardHeader as SemanticSurfaceCardHeader,
  CardTitle as SemanticSurfaceCardTitle,
  CardDescription as SemanticSurfaceCardDescription,
  CardAction as SemanticSurfaceCardAction,
  CardContent as SemanticSurfaceCardContent,
  CardFooter as SemanticSurfaceCardFooter,
};
