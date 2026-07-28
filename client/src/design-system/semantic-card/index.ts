/**
 * SEMANTIC-CARD-DESIGN-SYSTEM-1 + PLATFORM-CARD-DESIGN-SYSTEM-UNIFICATION-1
 * Official MineuQR Semantic Card Design System — public barrel.
 *
 * Data authority (unchanged):
 *   shared/reporting-platform/kpiDictionary.ts
 *   shared/reporting-platform/productSemantics.ts
 *
 * Presentation authority (this package):
 *   tokens + components below — Single Source of Truth for all platform cards.
 */
export {
  SEMANTIC_PANEL_BASE,
  SEMANTIC_HOVER_GLOW,
  SEMANTIC_MOTION,
  SEMANTIC_SHELL,
  SEMANTIC_KPI_GRID,
  semanticPanel,
} from "./tokens/panel";

export {
  SEMANTIC_TONE,
  semanticToneIconClass,
  semanticToneBadgeClass,
  semanticToneRowClass,
  legacyToneToSemanticTone,
  type SemanticTone,
} from "./tokens/semanticTone";

export {
  SEMANTIC_CATEGORY_HEX,
  SEMANTIC_CATEGORY_SURFACE,
  SEMANTIC_CATEGORY_ICON,
  semanticCategoryFill,
  semanticCategorySurface,
  type SemanticExecutiveCategory,
  type SemanticCategorySurface,
} from "./tokens/category";

export {
  SEMANTIC_DOMAIN_HEX,
  SEMANTIC_DOMAIN_SURFACE,
  LANDING_ACCENT_TO_DOMAIN,
  semanticDomainFill,
  semanticDomainHex,
  semanticDomainSurface,
  type SemanticDomain,
  type SemanticDomainSurface,
} from "./tokens/domain";

export {
  SEMANTIC_ICON,
  semanticIconContainerClass,
} from "./tokens/icon";

export {
  semanticCardTypeClass,
  type SemanticCardType,
  type SemanticCardTypeOptions,
} from "./tokens/cardType";

export {
  SEMANTIC_VALUE,
  type SemanticValueVariant,
} from "./tokens/value";

export {
  SemanticKpiCard,
  type SemanticKpiCardProps,
  type SemanticCardEmphasis,
} from "./components/SemanticKpiCard";

export {
  SemanticExecutiveCard,
  SemanticExecutiveGrid,
  type SemanticExecutiveCardModel,
} from "./components/SemanticExecutiveCard";

export {
  SemanticKpiSkeleton,
  SemanticExecutiveSkeleton,
} from "./components/SemanticSkeleton";

export {
  SemanticEmptyState,
  SemanticExecutiveEmptyState,
} from "./components/SemanticEmptyState";

export {
  SemanticSurfaceCard,
  SemanticSurfaceCardHeader,
  SemanticSurfaceCardTitle,
  SemanticSurfaceCardDescription,
  SemanticSurfaceCardAction,
  SemanticSurfaceCardContent,
  SemanticSurfaceCardFooter,
  type SemanticSurfaceCardProps,
} from "./components/SemanticSurfaceCard";
