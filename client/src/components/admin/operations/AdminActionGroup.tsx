import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { adminDash } from "../layout/adminDashStyles";

type AdminActionGroupProps = {
  primary?: ReactNode;
  secondary?: ReactNode;
  neutral?: ReactNode;
  danger?: ReactNode;
  className?: string;
  /** UX-REFINE-1A — inline icon row for table cells (no separators). */
  compact?: boolean;
  /** Accessible label for the action toolbar */
  ariaLabel?: string;
};

function ActionZone({ children, className }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} role="group">
      {children}
    </div>
  );
}

/**
 * Groups admin operations with visual hierarchy:
 * primary → secondary → neutral → danger (separated).
 */
export function AdminActionGroup({
  primary,
  secondary,
  neutral,
  danger,
  className,
  compact = false,
  ariaLabel,
}: AdminActionGroupProps) {
  const hasContent = primary || secondary || neutral || danger;
  if (!hasContent) return null;

  if (compact) {
    return (
      <div
        className={cn("inline-flex flex-wrap items-center gap-0.5", className)}
        role="toolbar"
        aria-label={ariaLabel}
      >
        {primary}
        {secondary}
        {neutral}
        {danger}
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3", className)}
      role="toolbar"
      aria-label={ariaLabel}
    >
      <ActionZone className={adminDash.actionPrimary}>{primary}</ActionZone>
      {secondary ? (
        <>
          <div className="hidden h-6 w-px bg-border/60 sm:block" aria-hidden />
          <ActionZone className={adminDash.actionSecondary}>{secondary}</ActionZone>
        </>
      ) : null}
      {neutral ? (
        <>
          <div className="hidden h-6 w-px bg-border/60 sm:block" aria-hidden />
          <ActionZone>{neutral}</ActionZone>
        </>
      ) : null}
      {danger ? (
        <>
          <div className="hidden h-6 w-px bg-border/60 sm:block" aria-hidden />
          <ActionZone className="sm:ms-auto">{danger}</ActionZone>
        </>
      ) : null}
    </div>
  );
}
