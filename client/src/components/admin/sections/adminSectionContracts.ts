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

export type AdminPageSectionProps = AdminSectionHeaderContract & {
  children?: ReactNode;
  /** Preserves per-section spacing (`space-y-3` vs `space-y-4`). */
  spacing?: "compact" | "default";
  className?: string;
};
