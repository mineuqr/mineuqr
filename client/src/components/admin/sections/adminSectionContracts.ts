import type { ReactNode } from "react";

/** REBUILD-4D — shared section metadata contract (ownership only; no visual redesign). */
export type AdminSectionHeaderContract = {
  title: string;
  description?: string;
};

export type AdminSectionLoadingContract = {
  isLoading?: boolean;
  /** Passed to PageDataLoading / AdminLoadingState min-height classes. */
  loadingMinHeight?: string;
};

export type AdminPageSectionProps = Partial<AdminSectionHeaderContract> & {
  children?: ReactNode;
  /** Screen-reader label when visual section title is omitted (UX-REFINE-1C). */
  ariaLabel?: string;
  /** Preserves per-section spacing. */
  spacing?: "tight" | "compact" | "default";
  /** Console sections use a smaller heading tier. */
  titleVariant?: "default" | "compact";
  className?: string;
};
