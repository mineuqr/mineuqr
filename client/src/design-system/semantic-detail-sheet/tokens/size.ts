/**
 * SEMANTIC-DETAIL-SHEET-PLATFORM-1 — width tokens.
 */
export type SemanticDetailSheetSize = "sm" | "md" | "lg" | "xl";

export const SEMANTIC_DETAIL_SHEET_SIZE_CLASS: Record<
  SemanticDetailSheetSize,
  string
> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-xl",
  xl: "sm:max-w-2xl",
};
