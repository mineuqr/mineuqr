/**
 * PLATFORM-CARD-DESIGN-SYSTEM-UNIFICATION-1
 * Domain semantic color SSOT — one owner for product-domain accents.
 * Aligns Landing accents, Executive categories, and tone families.
 * Presentation only. No financial or workflow meaning.
 */
import { SEMANTIC_CATEGORY_HEX } from "./category";
import { SEMANTIC_TONE } from "./semanticTone";

/**
 * Platform domain keys used by feature / summary / navigation / status cards.
 * Maps onto category hex + tone families so colors are defined once.
 */
export type SemanticDomain =
  | "analytics"
  | "payments"
  | "revenue"
  | "kitchen"
  | "orders"
  | "qr"
  | "growth"
  | "success"
  | "warning"
  | "danger"
  | "information";

/** Hex SSOT — charts, landing CSS vars, and accent chips must derive from this. */
export const SEMANTIC_DOMAIN_HEX = Object.freeze({
  analytics: "#22d3ee", // cyan-400 — info / management
  payments: SEMANTIC_CATEGORY_HEX.cash, // #34d399
  revenue: "#fbbf24", // amber-400 — revenue emphasis
  kitchen: SEMANTIC_CATEGORY_HEX.tax, // #a78bfa
  orders: SEMANTIC_CATEGORY_HEX.orders, // #fb923c
  qr: SEMANTIC_CATEGORY_HEX.orders, // #fb923c — QR shares orders family
  growth: SEMANTIC_CATEGORY_HEX.net, // #2dd4bf
  success: "#4ade80", // green-400
  warning: "#fb923c", // orange-400
  danger: "#f87171", // red-400
  information: "#22d3ee", // cyan-400
} as const satisfies Record<SemanticDomain, string>);

export type SemanticDomainSurface = {
  shell: string;
  icon: string;
  title: string;
  glow: string;
};

/**
 * Soft domain shells — Landing feature cards + register/summary accents.
 * Same family language as SEMANTIC_CATEGORY_SURFACE (softer fill for content cards).
 */
export const SEMANTIC_DOMAIN_SURFACE = Object.freeze({
  analytics: {
    shell:
      "border-cyan-500/35 bg-gradient-to-b from-cyan-950/45 to-slate-900/90",
    icon: "text-cyan-400",
    title: "text-cyan-100/90",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_12px_28px_-8px_rgba(34,211,238,0.26)]",
  },
  payments: {
    shell:
      "border-emerald-500/35 bg-gradient-to-b from-emerald-950/40 to-slate-900/90",
    icon: "text-emerald-400",
    title: "text-emerald-100/90",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_12px_28px_-8px_rgba(52,211,153,0.26)]",
  },
  revenue: {
    shell:
      "border-amber-500/35 bg-gradient-to-b from-amber-950/35 to-slate-900/90",
    icon: "text-amber-400",
    title: "text-amber-100/90",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_12px_28px_-8px_rgba(251,191,36,0.26)]",
  },
  kitchen: {
    shell:
      "border-violet-500/35 bg-gradient-to-b from-violet-950/40 to-slate-900/90",
    icon: "text-violet-400",
    title: "text-violet-100/90",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_12px_28px_-8px_rgba(167,139,250,0.26)]",
  },
  orders: {
    shell:
      "border-orange-500/35 bg-gradient-to-b from-orange-950/35 to-slate-900/90",
    icon: "text-orange-400",
    title: "text-orange-100/90",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_12px_28px_-8px_rgba(251,146,60,0.26)]",
  },
  qr: {
    shell:
      "border-orange-500/35 bg-gradient-to-b from-orange-950/35 to-slate-900/90",
    icon: "text-orange-400",
    title: "text-orange-100/90",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_12px_28px_-8px_rgba(251,146,60,0.26)]",
  },
  growth: {
    shell:
      "border-teal-500/40 bg-gradient-to-b from-teal-950/50 to-slate-900/90",
    icon: "text-teal-300",
    title: "text-teal-100/90",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_14px_32px_-8px_rgba(45,212,191,0.30)]",
  },
  success: {
    shell:
      "border-green-500/35 bg-gradient-to-b from-green-950/35 to-slate-900/90",
    icon: SEMANTIC_TONE.icon.success,
    title: "text-green-100/90",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_12px_28px_-8px_rgba(74,222,128,0.24)]",
  },
  warning: {
    shell:
      "border-orange-500/35 bg-gradient-to-b from-orange-950/35 to-slate-900/90",
    icon: SEMANTIC_TONE.icon.warning,
    title: "text-orange-100/90",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_12px_28px_-8px_rgba(251,146,60,0.24)]",
  },
  danger: {
    shell:
      "border-red-500/35 bg-gradient-to-b from-red-950/35 to-slate-900/90",
    icon: SEMANTIC_TONE.icon.danger,
    title: "text-red-100/90",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_12px_28px_-8px_rgba(248,113,113,0.24)]",
  },
  information: {
    shell:
      "border-cyan-500/35 bg-gradient-to-b from-cyan-950/40 to-slate-900/90",
    icon: SEMANTIC_TONE.icon.info,
    title: "text-cyan-100/90",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_12px_28px_-8px_rgba(34,211,238,0.26)]",
  },
} as const satisfies Record<SemanticDomain, SemanticDomainSurface>);

/** Landing `data-accent` → SemanticDomain (single mapping). */
export const LANDING_ACCENT_TO_DOMAIN = Object.freeze({
  qr: "qr",
  ordering: "orders",
  kitchen: "kitchen",
  payments: "payments",
  analytics: "analytics",
  tables: "orders",
  mgmt: "analytics",
  growth: "growth",
  lang: "information",
} as const satisfies Record<string, SemanticDomain>);

export function semanticDomainSurface(domain: SemanticDomain): SemanticDomainSurface {
  return SEMANTIC_DOMAIN_SURFACE[domain];
}

export function semanticDomainHex(domain: SemanticDomain): string {
  return SEMANTIC_DOMAIN_HEX[domain];
}

export function semanticDomainFill(domain: SemanticDomain, alpha = 0.22): string {
  const hex = SEMANTIC_DOMAIN_HEX[domain];
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
