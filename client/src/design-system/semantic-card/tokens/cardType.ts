/**
 * PLATFORM-CARD-DESIGN-SYSTEM-UNIFICATION-1
 * Card type recipes — every variation inherits the same cyan-panel language.
 * Types differ by weight / padding / interactivity only — not by inventing new chrome.
 */
import { cn } from "@/lib/utils";
import {
  SEMANTIC_DOMAIN_SURFACE,
  type SemanticDomain,
} from "./domain";
import {
  SEMANTIC_HOVER_GLOW,
  SEMANTIC_MOTION,
  SEMANTIC_PANEL_BASE,
  semanticPanel,
} from "./panel";

/**
 * Canonical platform card types.
 * KPI / executive remain SemanticKpiCard / SemanticExecutiveCard.
 */
export type SemanticCardType =
  | "standard"
  | "executive-kpi"
  | "feature"
  | "summary"
  | "analytics"
  | "status"
  | "information"
  | "navigation"
  | "settings"
  | "preview"
  | "action"
  | "selection"
  | "empty";

export type SemanticCardTypeOptions = {
  /** Optional domain — Reporting tinted surface replaces cyan panel base. */
  domain?: SemanticDomain;
  /** Apply hover glow (default true for interactive types). */
  interactive?: boolean;
};

const CONTENT_RESET = "gap-0 py-0 shadow-none";

/**
 * Resolve shell classes for a card type.
 * Domain cards use Reporting tinted surfaces (REPORTING-SEMANTIC-SURFACE-PLATFORM-ADOPTION-1).
 * Non-domain types keep the cyan panel base.
 */
export function semanticCardTypeClass(
  type: SemanticCardType = "standard",
  options: SemanticCardTypeOptions = {}
): string {
  const interactive =
    options.interactive ??
    (type !== "empty" && type !== "information" && type !== "settings");

  const glow = interactive ? SEMANTIC_HOVER_GLOW : SEMANTIC_MOTION;
  const domainSurface = options.domain
    ? cn(
        SEMANTIC_DOMAIN_SURFACE[options.domain].shell,
        interactive
          ? SEMANTIC_DOMAIN_SURFACE[options.domain].glow
          : SEMANTIC_MOTION
      )
    : null;

  // When domain is set, Reporting surface replaces cyan panel base.
  const base = domainSurface ?? SEMANTIC_PANEL_BASE;
  const baseMotion = domainSurface ? null : glow;

  switch (type) {
    case "executive-kpi":
      return cn(
        domainSurface
          ? cn("group rounded-xl overflow-hidden", CONTENT_RESET, domainSurface)
          : semanticPanel.kpi
      );
    case "feature":
      return cn(
        domainSurface ? "semantic-card" : base,
        "overflow-hidden rounded-2xl",
        CONTENT_RESET,
        baseMotion,
        domainSurface
      );
    case "summary":
      return cn(
        domainSurface ? "semantic-card" : base,
        "overflow-hidden p-4 sm:p-5",
        CONTENT_RESET,
        baseMotion,
        domainSurface
      );
    case "analytics":
      return cn(
        domainSurface ? cn("semantic-card rounded-xl overflow-hidden", domainSurface) : semanticPanel.card
      );
    case "status":
      return cn(
        domainSurface ? "semantic-card" : base,
        "overflow-hidden p-4 sm:p-5",
        CONTENT_RESET,
        baseMotion,
        domainSurface
      );
    case "information":
      return cn(semanticPanel.inset, "p-4 sm:p-5", CONTENT_RESET);
    case "navigation":
      return cn(
        domainSurface
          ? cn("semantic-card rounded-xl overflow-hidden cursor-pointer", domainSurface)
          : cn(semanticPanel.card, "cursor-pointer")
      );
    case "settings":
      return cn(semanticPanel.card, CONTENT_RESET);
    case "preview":
      return cn(semanticPanel.hero, CONTENT_RESET, glow);
    case "action":
      return cn(
        domainSurface
          ? cn("semantic-card rounded-xl overflow-hidden cursor-pointer", domainSurface)
          : cn(semanticPanel.card, "cursor-pointer", glow)
      );
    case "selection":
      return cn(
        domainSurface ? "semantic-card" : base,
        "overflow-hidden cursor-pointer",
        CONTENT_RESET,
        baseMotion,
        "data-[selected=true]:border-cyan-400/50 data-[selected=true]:shadow-sm data-[selected=true]:shadow-cyan-500/15",
        domainSurface
      );
    case "empty":
      return cn(semanticPanel.empty, CONTENT_RESET);
    case "standard":
    default:
      return cn(
        domainSurface
          ? cn("semantic-card rounded-xl overflow-hidden", domainSurface)
          : semanticPanel.card
      );
  }
}
