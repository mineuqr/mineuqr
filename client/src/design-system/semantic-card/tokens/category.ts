/**
 * SEMANTIC-CARD-DESIGN-SYSTEM-1
 * Executive category SSOT — hex + Tailwind surface for cash/card/refund/tax/orders/net.
 * Charts, executive cards, and landing accents must derive from this module.
 * Presentation only. No financial meaning.
 */
import type { ComponentType } from "react";
import {
  Banknote,
  ClipboardList,
  CreditCard,
  Receipt,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export type SemanticExecutiveCategory =
  | "cash"
  | "card"
  | "refund"
  | "tax"
  | "orders"
  | "net"
  | "neutral";

/** Hex SSOT — charts / strips / PDF color families. */
export const SEMANTIC_CATEGORY_HEX = Object.freeze({
  cash: "#34d399",
  card: "#38bdf8",
  refund: "#fb7185",
  tax: "#a78bfa",
  orders: "#fb923c",
  net: "#2dd4bf",
  neutral: "#94a3b8",
} as const satisfies Record<SemanticExecutiveCategory, string>);

export type SemanticCategorySurface = {
  shell: string;
  icon: string;
  value: string;
  glow: string;
};

/**
 * Tailwind surface SSOT — interactive executive cards.
 * Must stay visually aligned with SEMANTIC_CATEGORY_HEX families.
 * PREMIUM-INTERACTION-1 — richer glow depth without raising saturation.
 */
export const SEMANTIC_CATEGORY_SURFACE = Object.freeze({
  cash: {
    shell:
      "border-emerald-500/35 bg-gradient-to-b from-emerald-950/45 to-slate-900/85",
    icon: "text-emerald-400",
    value: "text-emerald-300",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_0_0_1px_rgba(52,211,153,0.12),0_14px_36px_-10px_rgba(52,211,153,0.32)]",
  },
  card: {
    shell:
      "border-sky-500/35 bg-gradient-to-b from-sky-950/40 to-slate-900/85",
    icon: "text-sky-400",
    value: "text-sky-300",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_0_0_1px_rgba(56,189,248,0.12),0_14px_36px_-10px_rgba(56,189,248,0.32)]",
  },
  refund: {
    shell:
      "border-rose-500/35 bg-gradient-to-b from-rose-950/40 to-slate-900/85",
    icon: "text-rose-400",
    value: "text-rose-300",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_0_0_1px_rgba(251,113,133,0.12),0_14px_36px_-10px_rgba(251,113,133,0.30)]",
  },
  tax: {
    shell:
      "border-violet-500/35 bg-gradient-to-b from-violet-950/40 to-slate-900/85",
    icon: "text-violet-400",
    value: "text-violet-300",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_0_0_1px_rgba(167,139,250,0.12),0_14px_36px_-10px_rgba(167,139,250,0.30)]",
  },
  orders: {
    shell:
      "border-orange-500/35 bg-gradient-to-b from-orange-950/35 to-slate-900/85",
    icon: "text-orange-400",
    value: "text-orange-300",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_0_0_1px_rgba(251,146,60,0.12),0_14px_36px_-10px_rgba(251,146,60,0.30)]",
  },
  net: {
    shell:
      "border-teal-500/40 bg-gradient-to-b from-teal-950/50 to-slate-900/90 sm:col-span-2 lg:col-span-2",
    icon: "text-teal-300",
    value:
      "bg-gradient-to-b from-teal-200 via-emerald-300 to-teal-400 bg-clip-text text-transparent",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(45,212,191,0.16),0_16px_40px_-10px_rgba(45,212,191,0.36)]",
  },
  neutral: {
    shell:
      "border-cyan-500/30 bg-gradient-to-b from-slate-800/50 to-slate-900/50",
    icon: "text-slate-400",
    value: "text-white",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(34,211,238,0.10),0_12px_28px_-8px_rgba(6,182,212,0.22)]",
  },
} as const satisfies Record<SemanticExecutiveCategory, SemanticCategorySurface>);

/** Canonical executive category icons — one map, platform reusable. */
export const SEMANTIC_CATEGORY_ICON: Record<
  Exclude<SemanticExecutiveCategory, "neutral">,
  ComponentType<{ className?: string }>
> = {
  cash: Banknote,
  card: CreditCard,
  refund: RotateCcw,
  tax: Receipt,
  orders: ClipboardList,
  net: Sparkles,
};

export function semanticCategoryFill(
  category: SemanticExecutiveCategory,
  alpha = 0.22
): string {
  const hex = SEMANTIC_CATEGORY_HEX[category];
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function semanticCategorySurface(
  category: SemanticExecutiveCategory
): SemanticCategorySurface {
  return SEMANTIC_CATEGORY_SURFACE[category];
}
