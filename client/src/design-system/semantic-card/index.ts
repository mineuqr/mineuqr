/**
 * SEMANTIC-CARD-DESIGN-SYSTEM-1
 * Official MineuQR Semantic Card Design System — public barrel.
 *
 * Data authority (unchanged):
 *   shared/reporting-platform/kpiDictionary.ts
 *   shared/reporting-platform/productSemantics.ts
 *
 * Presentation authority (this package):
 *   tokens + components below
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
