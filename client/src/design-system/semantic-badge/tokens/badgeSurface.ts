/**
 * SEMANTIC-STATUS-BADGE-SYSTEM-1
 * Badge chrome — size, radius, focus. Consumes panel focus language.
 */
import { cn } from "@/lib/utils";

export type SemanticBadgeSize = "sm" | "md" | "lg";

export const SEMANTIC_BADGE_BASE =
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border font-medium transition-[color,box-shadow,opacity] overflow-hidden [&>svg]:pointer-events-none [&>svg]:size-3";

export const SEMANTIC_BADGE_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

export function semanticBadgeSizeClass(size: SemanticBadgeSize = "sm"): string {
  switch (size) {
    case "lg":
      return "rounded-full px-3 py-1 text-sm";
    case "md":
      return "rounded-full px-2.5 py-0.5 text-sm";
    case "sm":
    default:
      return "rounded-full px-2.5 py-0.5 text-xs";
  }
}

export function semanticBadgeCompactClass(): string {
  return "rounded-md px-1.5 py-0 text-[10px] leading-4";
}

export function semanticBadgeCountClass(): string {
  return "min-w-5 justify-center rounded-full px-1.5 py-0 text-[10px] tabular-nums";
}

export function semanticBadgeShell(
  size: SemanticBadgeSize = "sm",
  options?: { compact?: boolean; count?: boolean }
): string {
  if (options?.count) {
    return cn(SEMANTIC_BADGE_BASE, semanticBadgeCountClass());
  }
  if (options?.compact) {
    return cn(SEMANTIC_BADGE_BASE, semanticBadgeCompactClass());
  }
  return cn(SEMANTIC_BADGE_BASE, semanticBadgeSizeClass(size));
}
