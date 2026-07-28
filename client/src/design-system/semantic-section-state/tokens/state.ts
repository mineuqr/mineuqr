/**
 * SEMANTIC-SECTION-STATE-PLATFORM-1 — density / surface tokens.
 */
export type SemanticSectionStateKind =
  | "loading"
  | "skeleton"
  | "empty"
  | "error"
  | "success"
  | "offline"
  | "refreshing";

export type SemanticSectionDensity = "section" | "page" | "admin" | "panel" | "premium";

export type SemanticSkeletonVariant =
  | "kpi"
  | "executive"
  | "cardList"
  | "tableRows"
  | "list"
  | "inline";
