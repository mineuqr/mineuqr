/**
 * SEMANTIC-CARD-DESIGN-SYSTEM-1
 * Semantic tone SSOT — success / warning / danger / info / neutral / accent.
 * One owner for platform tone colors used by KPI icons, badges, and rows.
 */
export type SemanticTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "accent";

/** Canonical tone class map — do not fork elsewhere. */
export const SEMANTIC_TONE = Object.freeze({
  icon: {
    neutral: "text-slate-400",
    info: "text-cyan-400",
    success: "text-green-400",
    warning: "text-orange-400",
    danger: "text-red-400",
    accent: "text-violet-400",
  },
  row: {
    neutral: "border-slate-700/40 bg-slate-900/30",
    info: "border-cyan-500/25 bg-cyan-500/5",
    success: "border-green-500/25 bg-green-500/5",
    warning: "border-orange-500/25 bg-orange-500/5",
    danger: "border-red-500/25 bg-red-500/5",
    accent: "border-violet-500/25 bg-violet-500/5",
  },
  badge: {
    neutral: "border-slate-600/40 bg-slate-800/50 text-slate-300",
    info: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
    success: "border-green-500/30 bg-green-500/10 text-green-400",
    warning: "border-orange-500/30 bg-orange-500/10 text-orange-400",
    danger: "border-red-500/30 bg-red-500/10 text-red-400",
    accent: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  },
  value: {
    neutral: "text-slate-400",
    info: "text-cyan-300",
    success: "text-green-400",
    warning: "text-orange-400",
    danger: "text-red-400",
    accent: "text-violet-300",
  },
} as const);

export function semanticToneIconClass(tone: SemanticTone = "neutral"): string {
  return SEMANTIC_TONE.icon[tone];
}

export function semanticToneBadgeClass(tone: SemanticTone = "neutral"): string {
  return SEMANTIC_TONE.badge[tone];
}

export function semanticToneRowClass(tone: SemanticTone = "neutral"): string {
  return SEMANTIC_TONE.row[tone];
}

/** Compatibility — legacy RestaurantKpiCard tone aliases → SemanticTone. */
export function legacyToneToSemanticTone(
  tone:
    | "default"
    | "primary"
    | "accent"
    | "emerald"
    | "amber"
    | "neutral"
    | SemanticTone
): SemanticTone {
  if (tone === "default" || tone === "neutral") return "neutral";
  if (tone === "primary") return "info";
  if (tone === "emerald") return "success";
  if (tone === "amber") return "warning";
  if (
    tone === "info" ||
    tone === "success" ||
    tone === "warning" ||
    tone === "danger" ||
    tone === "accent"
  ) {
    return tone;
  }
  return "neutral";
}
