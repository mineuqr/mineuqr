/**
 * SEMANTIC-CARD-PLATFORM-ADOPTION-1
 * Typed adapter: ExecutivePeriodCard VM → SemanticExecutiveGrid.
 * Official card implementation remains SemanticExecutiveCard only.
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
