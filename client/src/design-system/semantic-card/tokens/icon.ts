/**
 * PLATFORM-CARD-DESIGN-SYSTEM-UNIFICATION-1
 * Icon container SSOT — Landing / Dashboard / Admin share one recipe.
 * Presentation only.
 */
import { cn } from "@/lib/utils";
import { SEMANTIC_MOTION } from "./panel";
import {
  SEMANTIC_DOMAIN_SURFACE,
  type SemanticDomain,
} from "./domain";
import { semanticToneIconClass, type SemanticTone } from "./semanticTone";

const ICON_WELL_BASE = cn(
  "flex shrink-0 items-center justify-center rounded-xl border bg-slate-900/60",
  SEMANTIC_MOTION
);

export const SEMANTIC_ICON = {
  base: ICON_WELL_BASE,
  /** Default dashboard / landing well */
  md: cn(ICON_WELL_BASE, "h-9 w-9 border-cyan-500/20 text-cyan-400 [&_svg]:size-4"),
  sm: cn(ICON_WELL_BASE, "h-8 w-8 border-cyan-500/20 [&_svg]:size-4"),
  lg: cn(ICON_WELL_BASE, "h-10 w-10 border-cyan-500/20 [&_svg]:size-5"),
  /** Brand square — Pricing / shell identity */
  brand:
    "flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-900 [&_svg]:size-4",
} as const;

export function semanticIconContainerClass(
  size: "sm" | "md" | "lg" = "md",
  options?: { tone?: SemanticTone; domain?: SemanticDomain }
): string {
  const sizeClass =
    size === "sm" ? SEMANTIC_ICON.sm : size === "lg" ? SEMANTIC_ICON.lg : SEMANTIC_ICON.md;

  if (options?.domain) {
    const surface = SEMANTIC_DOMAIN_SURFACE[options.domain];
    return cn(
      ICON_WELL_BASE,
      size === "sm" ? "h-8 w-8 [&_svg]:size-4" : size === "lg" ? "h-10 w-10 [&_svg]:size-5" : "h-9 w-9 [&_svg]:size-4",
      "border-cyan-500/20",
      surface.icon
    );
  }

  if (options?.tone) {
    return cn(sizeClass, semanticToneIconClass(options.tone));
  }

  return sizeClass;
}
