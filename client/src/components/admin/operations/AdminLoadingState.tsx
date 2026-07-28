/**
 * SEMANTIC-SECTION-STATE-PLATFORM-1
 * Admin loading / skeleton — facade over Section State Platform.
 */
import {
  SemanticLoadingState,
  SemanticSkeletonState,
} from "@/design-system/semantic-section-state";

type AdminLoadingStateProps = {
  variant?: "inline" | "cardList" | "tableRows" | "kpiStrip";
  rows?: number;
  label?: string;
  className?: string;
};

export function AdminLoadingState({
  variant = "inline",
  rows = 3,
  label,
  className,
}: AdminLoadingStateProps) {
  if (variant === "inline") {
    return (
      <SemanticLoadingState
        variant="inline"
        label={label}
        className={className}
      />
    );
  }

  if (variant === "kpiStrip") {
    return (
      <SemanticSkeletonState
        variant="kpi"
        count={5}
        label={label}
        className={className}
      />
    );
  }

  if (variant === "tableRows") {
    return (
      <SemanticSkeletonState
        variant="tableRows"
        rows={rows}
        label={label}
        className={className}
      />
    );
  }

  return (
    <SemanticSkeletonState
      variant="cardList"
      rows={rows}
      label={label}
      className={className}
    />
  );
}
