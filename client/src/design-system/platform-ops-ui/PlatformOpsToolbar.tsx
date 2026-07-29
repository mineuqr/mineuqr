/**
 * PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * Filter toolbar — SemanticTableToolbar + Filters facade.
 */

import type { ComponentProps, ReactNode } from "react";
import {
  SemanticTableFilters,
  SemanticTableToolbar,
} from "@/design-system/semantic-table";
import { cn } from "@/lib/utils";

type PlatformOpsToolbarProps = ComponentProps<typeof SemanticTableToolbar> & {
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
};

/**
 * One operational toolbar: search · status/date/env filters · refresh/export actions.
 * Slots only — no business logic.
 */
export function PlatformOpsToolbar({
  search,
  filters,
  actions,
  className,
  children,
  ...props
}: PlatformOpsToolbarProps) {
  return (
    <SemanticTableToolbar
      data-slot="platform-ops-toolbar"
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    >
      {search ? <div className="min-w-[12rem] flex-1">{search}</div> : null}
      {filters ? (
        <SemanticTableFilters className="flex flex-wrap items-center gap-2">
          {filters}
        </SemanticTableFilters>
      ) : null}
      {actions ? (
        <div className="ms-auto flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
      {children}
    </SemanticTableToolbar>
  );
}

export function PlatformOpsToolbarFilters(
  props: ComponentProps<typeof SemanticTableFilters>
) {
  return <SemanticTableFilters {...props} />;
}
