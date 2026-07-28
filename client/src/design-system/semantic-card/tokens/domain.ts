/**
 * PLATFORM-CARD-DESIGN-SYSTEM-UNIFICATION-1
 * + SEMANTIC-DOMAIN-COLOR-ADOPTION-1
 * Domain semantic color SSOT — one owner for product-domain accents.
 * Aligns Landing accents, Executive categories, and tone families.
 * Presentation only. No financial or workflow meaning.
 *
 * Canonical identities (Landing + program):
 *   QR → Amber · Orders → Sky · Kitchen → Violet · Payments → Emerald
 *   Revenue → Emerald · Analytics/Sessions → Cyan · Growth → Teal
 *   Information → Blue/Sky · Success → Green · Warning → Amber · Danger → Red
 */
import { cn } from "@/lib/utils";
import { SEMANTIC_CATEGORY_HEX } from "./category";
import { SEMANTIC_TONE, type SemanticTone } from "./semanticTone";

/**
 * Platform domain keys used by feature / summary / navigation / status / KPI cards.
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
  analytics: "#22d3ee", // cyan-400 — analytics / sessions
  payments: SEMANTIC_CATEGORY_HEX.cash, // #34d399 emerald
  revenue: SEMANTIC_CATEGORY_HEX.cash, // emerald executive
  kitchen: SEMANTIC_CATEGORY_HEX.tax, // #a78bfa violet
  orders: SEMANTIC_CATEGORY_HEX.card, // #38bdf8 sky
  qr: "#fbbf24", // amber-400
  growth: SEMANTIC_CATEGORY_HEX.net, // #2dd4bf teal
  success: "#4ade80", // green-400
  warning: "#fbbf24", // amber-400
  danger: "#f87171", // red-400
  information: SEMANTIC_CATEGORY_HEX.card, // #38bdf8 blue/sky
} as const satisfies Record<SemanticDomain, string>);

export type SemanticDomainSurface = {
  shell: string;
  icon: string;
  title: string;
  glow: string;
};

/**
 * Soft domain shells — summary / status / feature cards when a filled shell is intentional.
 * Prefer SEMANTIC_DOMAIN_ACCENT on KPI cards (border / glow / icon only — no flood).
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
      "border-emerald-500/40 bg-gradient-to-b from-emerald-950/45 to-slate-900/90",
    icon: "text-emerald-300",
    title: "text-emerald-100/90",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_14px_32px_-8px_rgba(52,211,153,0.30)]",
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
      "border-sky-500/35 bg-gradient-to-b from-sky-950/40 to-slate-900/90",
    icon: "text-sky-400",
    title: "text-sky-100/90",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_12px_28px_-8px_rgba(56,189,248,0.26)]",
  },
  qr: {
    shell:
      "border-amber-500/35 bg-gradient-to-b from-amber-950/35 to-slate-900/90",
    icon: "text-amber-400",
    title: "text-amber-100/90",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_12px_28px_-8px_rgba(251,191,36,0.26)]",
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
      "border-amber-500/35 bg-gradient-to-b from-amber-950/35 to-slate-900/90",
    icon: "text-amber-400",
    title: "text-amber-100/90",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_12px_28px_-8px_rgba(251,191,36,0.24)]",
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
      "border-sky-500/35 bg-gradient-to-b from-sky-950/40 to-slate-900/90",
    icon: "text-sky-400",
    title: "text-sky-100/90",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_12px_28px_-8px_rgba(56,189,248,0.26)]",
  },
} as const satisfies Record<SemanticDomain, SemanticDomainSurface>);

export type SemanticDomainAccent = {
  /** Soft border tint — does not replace slate panel fill. */
  border: string;
  icon: string;
  hoverGlow: string;
};

/**
 * Controlled-area accents for KPI / ops tickets.
 * Affects border + hover glow + icon only — never floods the card body.
 */
export const SEMANTIC_DOMAIN_ACCENT = Object.freeze({
  analytics: {
    border: "border-cyan-500/40",
    icon: "text-cyan-400",
    hoverGlow:
      "hover:border-cyan-400/55 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(34,211,238,0.14),0_10px_28px_-8px_rgba(34,211,238,0.28)]",
  },
  payments: {
    border: "border-emerald-500/40",
    icon: "text-emerald-400",
    hoverGlow:
      "hover:border-emerald-400/55 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(52,211,153,0.14),0_10px_28px_-8px_rgba(52,211,153,0.28)]",
  },
  revenue: {
    border: "border-emerald-500/45",
    icon: "text-emerald-300",
    hoverGlow:
      "hover:border-emerald-400/60 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(52,211,153,0.16),0_12px_32px_-8px_rgba(52,211,153,0.32)]",
  },
  kitchen: {
    border: "border-violet-500/40",
    icon: "text-violet-400",
    hoverGlow:
      "hover:border-violet-400/55 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(167,139,250,0.14),0_10px_28px_-8px_rgba(167,139,250,0.28)]",
  },
  orders: {
    border: "border-sky-500/40",
    icon: "text-sky-400",
    hoverGlow:
      "hover:border-sky-400/55 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(56,189,248,0.14),0_10px_28px_-8px_rgba(56,189,248,0.28)]",
  },
  qr: {
    border: "border-amber-500/40",
    icon: "text-amber-400",
    hoverGlow:
      "hover:border-amber-400/55 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(251,191,36,0.14),0_10px_28px_-8px_rgba(251,191,36,0.28)]",
  },
  growth: {
    border: "border-teal-500/40",
    icon: "text-teal-300",
    hoverGlow:
      "hover:border-teal-400/55 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(45,212,191,0.16),0_12px_32px_-8px_rgba(45,212,191,0.30)]",
  },
  success: {
    border: "border-green-500/40",
    icon: SEMANTIC_TONE.icon.success,
    hoverGlow:
      "hover:border-green-400/55 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(74,222,128,0.14),0_10px_28px_-8px_rgba(74,222,128,0.26)]",
  },
  warning: {
    border: "border-amber-500/40",
    icon: "text-amber-400",
    hoverGlow:
      "hover:border-amber-400/55 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(251,191,36,0.14),0_10px_28px_-8px_rgba(251,191,36,0.26)]",
  },
  danger: {
    border: "border-red-500/40",
    icon: SEMANTIC_TONE.icon.danger,
    hoverGlow:
      "hover:border-red-400/55 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(248,113,113,0.14),0_10px_28px_-8px_rgba(248,113,113,0.26)]",
  },
  information: {
    border: "border-sky-500/40",
    icon: "text-sky-400",
    hoverGlow:
      "hover:border-sky-400/55 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(56,189,248,0.14),0_10px_28px_-8px_rgba(56,189,248,0.28)]",
  },
} as const satisfies Record<SemanticDomain, SemanticDomainAccent>);

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

export function semanticDomainAccent(domain: SemanticDomain): SemanticDomainAccent {
  return SEMANTIC_DOMAIN_ACCENT[domain];
}

/** Soft border + hover glow for KPI / ticket shells (no body flood). */
export function semanticDomainAccentClass(domain: SemanticDomain): string {
  const accent = SEMANTIC_DOMAIN_ACCENT[domain];
  return cn(accent.border, accent.hoverGlow);
}

export function semanticDomainIconClass(domain: SemanticDomain): string {
  return SEMANTIC_DOMAIN_ACCENT[domain].icon;
}

/** Map domain → nearest SemanticTone for badge / legacy tone APIs. */
export function semanticDomainToTone(domain: SemanticDomain): SemanticTone {
  switch (domain) {
    case "analytics":
      return "info";
    case "information":
      return "info";
    case "orders":
      return "info";
    case "payments":
    case "revenue":
    case "growth":
    case "success":
      return "success";
    case "kitchen":
      return "accent";
    case "qr":
    case "warning":
      return "warning";
    case "danger":
      return "danger";
    default:
      return "neutral";
  }
}
