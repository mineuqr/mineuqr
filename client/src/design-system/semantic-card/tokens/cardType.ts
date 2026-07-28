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
  /** Optional domain accent shell (feature / summary / status). */
  domain?: SemanticDomain;
  /** Apply hover glow (default true for interactive types). */
  interactive?: boolean;
};

const CONTENT_RESET = "gap-0 py-0 shadow-none";

/**
 * Resolve shell classes for a card type.
 * Always starts from SEMANTIC_PANEL_BASE — no custom shadows/borders/radius forks.
 */
export function semanticCardTypeClass(
  type: SemanticCardType = "standard",
  options: SemanticCardTypeOptions = {}
): string {
  const interactive =
    options.interactive ??
    (type !== "empty" && type !== "information" && type !== "settings");

  const glow = interactive ? SEMANTIC_HOVER_GLOW : SEMANTIC_MOTION;
  const domainShell = options.domain
    ? SEMANTIC_DOMAIN_SURFACE[options.domain].shell
    : null;
  const domainGlow =
    options.domain && interactive
      ? SEMANTIC_DOMAIN_SURFACE[options.domain].glow
      : null;

  switch (type) {
    case "executive-kpi":
      // Prefer SemanticKpiCard — this is a shell alias for rare custom KPI layouts.
      return cn(semanticPanel.kpi, domainShell, domainGlow);
    case "feature":
      return cn(
        SEMANTIC_PANEL_BASE,
        "overflow-hidden rounded-2xl",
        CONTENT_RESET,
        glow,
        domainShell,
        domainGlow
      );
    case "summary":
      return cn(
        SEMANTIC_PANEL_BASE,
        "overflow-hidden p-4 sm:p-5",
        CONTENT_RESET,
        glow,
        domainShell,
        domainGlow
      );
    case "analytics":
      return cn(semanticPanel.card, domainShell ?? "border-cyan-500/30", domainGlow);
    case "status":
      return cn(
        SEMANTIC_PANEL_BASE,
        "overflow-hidden p-4 sm:p-5",
        CONTENT_RESET,
        glow,
        domainShell,
        domainGlow
      );
    case "information":
      return cn(semanticPanel.inset, "p-4 sm:p-5", CONTENT_RESET);
    case "navigation":
      return cn(semanticPanel.card, "cursor-pointer", domainShell, domainGlow);
    case "settings":
      return cn(semanticPanel.card, CONTENT_RESET);
    case "preview":
      return cn(semanticPanel.hero, CONTENT_RESET, glow);
    case "action":
      return cn(semanticPanel.card, "cursor-pointer", glow, domainShell, domainGlow);
    case "selection":
      return cn(
        SEMANTIC_PANEL_BASE,
        "overflow-hidden cursor-pointer",
        CONTENT_RESET,
        glow,
        "data-[selected=true]:border-cyan-400/50 data-[selected=true]:shadow-sm data-[selected=true]:shadow-cyan-500/15",
        domainShell,
        domainGlow
      );
    case "empty":
      return cn(semanticPanel.empty, CONTENT_RESET);
    case "standard":
    default:
      return cn(semanticPanel.card, domainShell, domainGlow);
  }
}
