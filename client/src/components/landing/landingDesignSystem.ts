/**
 * LANDING-DESIGN-SYSTEM-ALIGNMENT-1 + SEMANTIC-CARD-DESIGN-SYSTEM-1
 * Bridge: landing surfaces inherit semantic panel recipes via restaurantDash facade.
 * Panel/tone SSOT: @/design-system/semantic-card
 *
 * Category accents (data-accent) map to SEMANTIC_CATEGORY_SURFACE:
 *   qr        → orders (orange)
 *   ordering  → card/sky
 *   kitchen   → tax/violet
 *   payments  → cash/emerald
 *   analytics → cyan info
 *   tables    → sky
 *   mgmt/lang → cyan panel
 *   growth    → net/teal
 */
import {
  restaurantDash,
  restaurantHoverGlow,
  restaurantMotion,
} from "@/components/dashboard/restaurantDashStyles";
import { cn } from "@/lib/utils";

/** Primary landing card — same panel + cyan hover glow as dashboard. */
export const landingDashCard = cn(
  restaurantDash.card,
  "relative overflow-hidden"
);

/** Supporting / secondary row — matches kpiCardSupporting weight. */
export const landingDashSupporting = cn(
  restaurantDash.kpiCardSupporting,
  restaurantHoverGlow,
  restaurantMotion
);

/** Icon well — identical visual weight to dashboard iconContainer. */
export const landingDashIcon = restaurantDash.iconContainer;
export const landingDashIconLg = restaurantDash.iconContainerLg;

/** Product preview outer frame — dashboard hero panel recipe. */
export const landingDashHeroPanel = cn(
  restaurantDash.hero,
  "relative overflow-hidden rounded-2xl"
);

/** Inset row — panelInset / itemRow weight. */
export const landingDashInset = cn(
  restaurantDash.itemRow,
  "p-3"
);

/** Toolbar-like chip / secondary control. */
export const landingDashChip = cn(
  "inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/20 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-300",
  restaurantMotion,
  "hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-400 hover:shadow-sm hover:shadow-cyan-500/10"
);

/** Live status pill — emerald success language from dashboard. */
export const landingDashStatusOk = cn(
  "inline-flex items-center gap-1 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-300"
);

/** Live / active pill — cyan info. */
export const landingDashStatusLive = cn(
  "inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-medium text-cyan-300"
);
