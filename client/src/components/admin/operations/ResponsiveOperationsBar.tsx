import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ResponsiveOperationsBarProps = {
  children: ReactNode;
  className?: string;
  /** Accessible label for search/filter toolbar */
  ariaLabel?: string;
};

export function ResponsiveOperationsBar({
  children,
  className,
  ariaLabel,
}: ResponsiveOperationsBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center",
        className
      )}
      role="search"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
