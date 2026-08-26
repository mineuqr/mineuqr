/**
 * PLATFORM-CARD-DESIGN-SYSTEM-UNIFICATION-1
 * + SEMANTIC-DOMAIN-COLOR-ADOPTION-1
 * + REPORTING-SEMANTIC-SURFACE-PLATFORM-ADOPTION-1
 *
 * Domain semantic surface SSOT — Reporting executive surfaces are the recipe.
 * Domains that map to Reporting categories reuse SEMANTIC_CATEGORY_SURFACE exactly.
 * Remaining domains use the same Reporting shell/glow template (no new hues).
 *
 * Presentation only. No financial or workflow meaning.
 *
 * Canonical identities:
 *   QR → Amber · Orders → Sky · Kitchen → Violet · Payments → Emerald
 *   Revenue → Emerald · Analytics/Sessions → Cyan · Growth → Teal
 *   Information → Blue/Sky · Success → Green · Warning → Amber · Danger → Red
 */
import { cn } from "@/lib/utils";
import {
  SEMANTIC_CATEGORY_HEX,
  SEMANTIC_CATEGORY_SURFACE,
  type SemanticExecutiveCategory,
} from "./category";
import { SEMANTIC_TONE, type SemanticTone } from "./semanticTone";

/**
 * Platform domain keys used by feature / summary / navigation / status / KPI cards.
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
  analytics: "#22d3ee",
  payments: SEMANTIC_CATEGORY_HEX.cash,
  revenue: SEMANTIC_CATEGORY_HEX.cash,
  kitchen: SEMANTIC_CATEGORY_HEX.tax,
  orders: SEMANTIC_CATEGORY_HEX.card,
  qr: "#fbbf24",
  growth: SEMANTIC_CATEGORY_HEX.net,
  success: "#4ade80",
  warning: "#fbbf24",
  danger: "#f87171",
  information: SEMANTIC_CATEGORY_HEX.card,
} as const satisfies Record<SemanticDomain, string>);

export type SemanticDomainSurface = {
  /** Reporting recipe: tinted gradient + semantic border (full card identity). */
  shell: string;
  icon: string;
  title: string;
  /** Reporting recipe glow — do not invent parallel glow strings. */
  glow: string;
};

/** Domain → Reporting executive category (reuse, do not approximate). */
export const DOMAIN_TO_REPORTING_CATEGORY = Object.freeze({
  payments: "cash",
  revenue: "cash",
  orders: "card",
  information: "card",
  kitchen: "tax",
  growth: "net",
  danger: "refund",
} as const satisfies Partial<
  Record<SemanticDomain, Exclude<SemanticExecutiveCategory, "neutral">>
>);

function reportingCategoryParts(
  category: Exclude<SemanticExecutiveCategory, "neutral">,
  options?: { stripColSpan?: boolean }
): Pick<SemanticDomainSurface, "shell" | "icon" | "glow"> {
  const surface = SEMANTIC_CATEGORY_SURFACE[category];
  let shell: string = surface.shell;
  if (options?.stripColSpan) {
    shell = shell
      .replace(/\s*sm:col-span-2/g, "")
      .replace(/\s*lg:col-span-2/g, "")
      .trim();
  }
  return { shell, icon: surface.icon, glow: surface.glow };
}

/**
 * Reporting-aligned domain surfaces — Single Source of Truth for business cards.
 * Mapped domains reuse SEMANTIC_CATEGORY_SURFACE verbatim (glow included).
 */
export const SEMANTIC_DOMAIN_SURFACE = Object.freeze({
  analytics: {
    shell:
      "border-cyan-500/45 bg-gradient-to-b from-cyan-950/45 to-slate-900/85",
    icon: "text-cyan-400",
    title: "text-cyan-100/90",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10),0_0_0_1px_rgba(34,211,238,0.18),0_18px_44px_-8px_rgba(34,211,238,0.42)]",
  },
  payments: {
    ...reportingCategoryParts("cash"),
    title: "text-emerald-100/90",
  },
  revenue: {
    ...reportingCategoryParts("cash"),
    icon: "text-emerald-300",
    title: "text-emerald-100/90",
  },
  kitchen: {
    ...reportingCategoryParts("tax"),
    title: "text-violet-100/90",
  },
  orders: {
    ...reportingCategoryParts("card"),
    title: "text-sky-100/90",
  },
  qr: {
    shell:
      "border-amber-500/45 bg-gradient-to-b from-amber-950/40 to-slate-900/85",
    icon: "text-amber-400",
    title: "text-amber-100/90",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10),0_0_0_1px_rgba(251,191,36,0.18),0_18px_44px_-8px_rgba(251,191,36,0.40)]",
  },
  growth: {
    ...reportingCategoryParts("net", { stripColSpan: true }),
    title: "text-teal-100/90",
  },
  success: {
    shell:
      "border-green-500/45 bg-gradient-to-b from-green-950/40 to-slate-900/85",
    icon: SEMANTIC_TONE.icon.success,
    title: "text-green-100/90",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10),0_0_0_1px_rgba(74,222,128,0.18),0_18px_44px_-8px_rgba(74,222,128,0.40)]",
  },
  warning: {
    shell:
      "border-amber-500/45 bg-gradient-to-b from-amber-950/40 to-slate-900/85",
    icon: "text-amber-400",
    title: "text-amber-100/90",
    glow: "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10),0_0_0_1px_rgba(251,191,36,0.18),0_18px_44px_-8px_rgba(251,191,36,0.40)]",
  },
  danger: {
    ...reportingCategoryParts("refund"),
    title: "text-rose-100/90",
  },
  information: {
    ...reportingCategoryParts("card"),
    title: "text-sky-100/90",
  },
} as const satisfies Record<SemanticDomain, SemanticDomainSurface>);

/**
 * @deprecated Prefer SEMANTIC_DOMAIN_SURFACE (Reporting full surface).
 * Border-only accents retained for non-business chrome only.
 */
export type SemanticDomainAccent = {
  border: string;
  icon: string;
  hoverGlow: string;
};

/** @deprecated Use semanticDomainReportingSurfaceClass for business cards. */
export const SEMANTIC_DOMAIN_ACCENT = Object.freeze({
  analytics: {
    border: "border-cyan-500/45",
    icon: SEMANTIC_DOMAIN_SURFACE.analytics.icon,
    hoverGlow: SEMANTIC_DOMAIN_SURFACE.analytics.glow,
  },
  payments: {
    border: "border-emerald-500/45",
    icon: SEMANTIC_DOMAIN_SURFACE.payments.icon,
    hoverGlow: SEMANTIC_DOMAIN_SURFACE.payments.glow,
  },
  revenue: {
    border: "border-emerald-500/45",
    icon: SEMANTIC_DOMAIN_SURFACE.revenue.icon,
    hoverGlow: SEMANTIC_DOMAIN_SURFACE.revenue.glow,
  },
  kitchen: {
    border: "border-violet-500/45",
    icon: SEMANTIC_DOMAIN_SURFACE.kitchen.icon,
    hoverGlow: SEMANTIC_DOMAIN_SURFACE.kitchen.glow,
  },
  orders: {
    border: "border-sky-500/45",
    icon: SEMANTIC_DOMAIN_SURFACE.orders.icon,
    hoverGlow: SEMANTIC_DOMAIN_SURFACE.orders.glow,
  },
  qr: {
    border: "border-amber-500/45",
    icon: SEMANTIC_DOMAIN_SURFACE.qr.icon,
    hoverGlow: SEMANTIC_DOMAIN_SURFACE.qr.glow,
  },
  growth: {
    border: "border-teal-500/50",
    icon: SEMANTIC_DOMAIN_SURFACE.growth.icon,
    hoverGlow: SEMANTIC_DOMAIN_SURFACE.growth.glow,
  },
  success: {
    border: "border-green-500/45",
    icon: SEMANTIC_DOMAIN_SURFACE.success.icon,
    hoverGlow: SEMANTIC_DOMAIN_SURFACE.success.glow,
  },
  warning: {
    border: "border-amber-500/45",
    icon: SEMANTIC_DOMAIN_SURFACE.warning.icon,
    hoverGlow: SEMANTIC_DOMAIN_SURFACE.warning.glow,
  },
  danger: {
    border: "border-rose-500/45",
    icon: SEMANTIC_DOMAIN_SURFACE.danger.icon,
    hoverGlow: SEMANTIC_DOMAIN_SURFACE.danger.glow,
  },
  information: {
    border: "border-sky-500/45",
    icon: SEMANTIC_DOMAIN_SURFACE.information.icon,
    hoverGlow: SEMANTIC_DOMAIN_SURFACE.information.glow,
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

/** @deprecated Prefer semanticDomainReportingSurfaceClass. */
export function semanticDomainAccentClass(domain: SemanticDomain): string {
  const accent = SEMANTIC_DOMAIN_ACCENT[domain];
  return cn(accent.border, accent.hoverGlow);
}

/**
 * Reporting semantic surface for business cards — tinted shell + Reporting glow.
 * This is the platform standard (REPORTING-SEMANTIC-SURFACE-PLATFORM-ADOPTION-1).
 */
export function semanticDomainReportingSurfaceClass(domain: SemanticDomain): string {
  const surface = SEMANTIC_DOMAIN_SURFACE[domain];
  return cn(surface.shell, surface.glow);
}

export function semanticDomainIconClass(domain: SemanticDomain): string {
  return SEMANTIC_DOMAIN_SURFACE[domain].icon;
}

/** Map domain → nearest SemanticTone for badge / legacy tone APIs. */
export function semanticDomainToTone(domain: SemanticDomain): SemanticTone {
  switch (domain) {
    case "analytics":
    case "information":
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
