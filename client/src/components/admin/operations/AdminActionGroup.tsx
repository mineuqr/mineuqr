import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { adminDash } from "../layout/adminDashStyles";

type AdminActionGroupProps = {
  primary?: ReactNode;
  secondary?: ReactNode;
  neutral?: ReactNode;
  danger?: ReactNode;
  className?: string;
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
  ariaLabel,
}: AdminActionGroupProps) {
  const hasContent = primary || secondary || neutral || danger;
  if (!hasContent) return null;

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
