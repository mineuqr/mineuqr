/**
 * SEMANTIC-SECTION-STATE-PLATFORM-1
 * Official MineuQR Semantic Section State Platform — public barrel.
 *
 * Presentation states only. Features own which state exists and all retry/query logic.
 */
export {
  SemanticSectionState,
  type SemanticSectionStateProps,
} from "./components/SemanticSectionState";

export {
  SemanticEmptyState,
  SemanticExecutiveEmptyState,
  SemanticSuccessState,
  SemanticOfflineState,
  type SemanticEmptyVariant,
} from "./components/SemanticEmptyState";

export {
  SemanticErrorState,
  type SemanticErrorVariant,
} from "./components/SemanticErrorState";

export {
  SemanticLoadingState,
  SemanticRefreshingState,
  SemanticSkeletonState,
  SemanticKpiSkeleton,
  SemanticExecutiveSkeleton,
} from "./components/SemanticLoadingState";

export {
  SemanticStateIllustration,
  SemanticStateActions,
  SemanticRetrySlot,
} from "./components/SemanticStateSlots";

export {
  type SemanticSectionStateKind,
  type SemanticSectionDensity,
  type SemanticSkeletonVariant,
} from "./tokens/state";
