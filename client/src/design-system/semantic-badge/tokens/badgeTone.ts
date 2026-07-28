/**
 * SEMANTIC-STATUS-BADGE-SYSTEM-1
 * Badge tone registry — presentation surfaces only.
 * Color families derive from SEMANTIC_TONE; lifecycle tones are presentation keys
 * that resolve to those families (do not redefine domain status meanings).
 */
import {
  SEMANTIC_TONE,
  type SemanticTone,
} from "@/design-system/semantic-card/tokens/semanticTone";

/**
 * Canonical badge tone keys.
 * Base tones share ownership with SEMANTIC_TONE.
 * Lifecycle / state keys are presentation-only and map to base surfaces.
 */
export type SemanticBadgeTone =
  | SemanticTone
  | "pending"
  | "processing"
  | "completed"
  | "cancelled"
  | "refunded"
  | "archived"
  | "disabled"
  | "executive"
  | "operational";

export type SemanticBadgeDensity = "soft" | "filled" | "outline";

/** Resolve any badge tone to a base SemanticTone (color family owner). */
export function resolveBadgeBaseTone(tone: SemanticBadgeTone): SemanticTone {
  switch (tone) {
    case "pending":
    case "warning":
      return "warning";
    case "processing":
    case "operational":
    case "info":
      return "info";
    case "completed":
    case "success":
      return "success";
    case "cancelled":
    case "refunded":
    case "danger":
      return "danger";
    case "executive":
    case "accent":
      return "accent";
    case "archived":
    case "disabled":
    case "neutral":
    default:
      return "neutral";
  }
}

/** Soft (outline-tint) — SSOT via SEMANTIC_TONE.badge */
const SOFT: Record<SemanticTone, string> = SEMANTIC_TONE.badge;

/** Filled — admin/commercial dense pills; one owner for filled recipe */
const FILLED: Record<SemanticTone, string> = Object.freeze({
  neutral: "border-transparent bg-slate-600/90 text-white",
  info: "border-transparent bg-cyan-500 text-slate-900",
  success: "border-transparent bg-green-600/90 text-white",
  warning: "border-transparent bg-orange-500/90 text-white",
  danger: "border-transparent bg-red-600/90 text-white",
  accent: "border-transparent bg-violet-600/90 text-white",
});

/** Outline — border dominant, transparent fill */
const OUTLINE: Record<SemanticTone, string> = Object.freeze({
  neutral: "border-slate-600/50 bg-transparent text-slate-400",
  info: "border-cyan-500/40 bg-transparent text-cyan-400",
  success: "border-green-500/40 bg-transparent text-green-400",
  warning: "border-orange-500/40 bg-transparent text-orange-400",
  danger: "border-red-500/40 bg-transparent text-red-400",
  accent: "border-violet-500/40 bg-transparent text-violet-400",
});

/** Dot indicator color */
const DOT: Record<SemanticTone, string> = Object.freeze({
  neutral: "bg-slate-400",
  info: "bg-cyan-400",
  success: "bg-green-400",
  warning: "bg-orange-400",
  danger: "bg-red-400",
  accent: "bg-violet-400",
});

export function semanticBadgeToneClass(
  tone: SemanticBadgeTone,
  density: SemanticBadgeDensity = "soft"
): string {
  const base = resolveBadgeBaseTone(tone);
  if (density === "filled") return FILLED[base];
  if (density === "outline") return OUTLINE[base];
  return SOFT[base];
}

export function semanticBadgeDotClass(tone: SemanticBadgeTone): string {
  return DOT[resolveBadgeBaseTone(tone)];
}

/** Hover for interactive filled/soft badges */
export function semanticBadgeHoverClass(
  tone: SemanticBadgeTone,
  density: SemanticBadgeDensity = "soft"
): string {
  const base = resolveBadgeBaseTone(tone);
  if (density === "filled") {
    const map: Record<SemanticTone, string> = {
      neutral: "hover:bg-slate-600",
      info: "hover:bg-cyan-400",
      success: "hover:bg-green-600",
      warning: "hover:bg-orange-500",
      danger: "hover:bg-red-600",
      accent: "hover:bg-violet-600",
    };
    return map[base];
  }
  return "hover:opacity-90";
}

export const SEMANTIC_BADGE_TONES = Object.freeze([
  "neutral",
  "info",
  "success",
  "warning",
  "danger",
  "accent",
  "pending",
  "processing",
  "completed",
  "cancelled",
  "refunded",
  "archived",
  "disabled",
  "executive",
  "operational",
] as const satisfies readonly SemanticBadgeTone[]);
