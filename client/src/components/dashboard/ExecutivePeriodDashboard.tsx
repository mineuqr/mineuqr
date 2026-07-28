/**
 * REPORTING-PRODUCT-UX-RESTRUCTURE-1/2 + SEMANTIC-CARD-DESIGN-SYSTEM-1
 * Interactive executive period cards — thin adapter over SemanticExecutiveCard.
 * Presentation / motion only. Values from parent view model.
 */
import {
  SemanticExecutiveCard,
  SemanticExecutiveGrid,
  type SemanticExecutiveCardModel,
} from "@/design-system/semantic-card";
import type { ExecutivePeriodCard } from "@/lib/reporting-exports/executivePeriodDashboard";

export function ExecutivePeriodKpiCard({
  card,
  onActivate,
  language = "en",
}: {
  card: ExecutivePeriodCard;
  onActivate?: (card: ExecutivePeriodCard) => void;
  language?: "en" | "ar";
}) {
  return (
    <SemanticExecutiveCard
      card={card as SemanticExecutiveCardModel}
      language={language}
      onActivate={
        onActivate
          ? (c) => onActivate(c as ExecutivePeriodCard)
          : undefined
      }
    />
  );
}

export function ExecutivePeriodDashboardGrid({
  cards,
  onActivate,
  language = "en",
}: {
  cards: readonly ExecutivePeriodCard[];
  onActivate?: (card: ExecutivePeriodCard) => void;
  language?: "en" | "ar";
}) {
  return (
    <SemanticExecutiveGrid
      cards={cards as readonly SemanticExecutiveCardModel[]}
      language={language}
      onActivate={
        onActivate
          ? (c) => onActivate(c as ExecutivePeriodCard)
          : undefined
      }
    />
  );
}
