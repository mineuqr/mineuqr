/**
 * SEMANTIC-CARD-PREMIUM-INTERACTION-1
 * + SEMANTIC-VISUAL-INTENSITY-CALIBRATION-1
 * Premium lighting, depth, motion, and interaction-state SSOT.
 * Presentation only — does not change layout, typography, or semantic colors.
 *
 * Intensity calibration (~+30% light alpha / glow radius — not saturation).
 *
 * Performance rules:
 * - Prefer transform / opacity / filter / box-shadow
 * - Spring-like cubic-bezier easing
 * - Always pair motion with motion-safe: (respects prefers-reduced-motion)
 */
import { cn } from "@/lib/utils";

/** Premium spring easing — Linear / Stripe-adjacent feel, not bouncy. */
export const SEMANTIC_EASE_PREMIUM =
  "motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]";

/** Duration token — soft, never flashy. */
export const SEMANTIC_DURATION_PREMIUM = "motion-safe:duration-300";

/**
 * GPU-friendly property allowlist.
 * Avoid transition-all (layout thrash risk on width/height/padding).
 */
export const SEMANTIC_MOTION_PREMIUM = cn(
  "motion-safe:transition-[transform,opacity,box-shadow,border-color,filter,background-color,color]",
  SEMANTIC_DURATION_PREMIUM,
  SEMANTIC_EASE_PREMIUM
);

/**
 * Rest depth — soft ambient + inset top highlight (physical surface).
 * Applied via `.semantic-card` CSS; this class opts into the lighting system.
 */
export const SEMANTIC_SURFACE_PREMIUM = "semantic-card";

/**
 * Intelligent hover — gentle lift, alive border, expanding ambient glow.
 * INTENSITY-1 — richer light diffusion without aggressive saturation.
 */
export const SEMANTIC_HOVER_PREMIUM = cn(
  SEMANTIC_MOTION_PREMIUM,
  "motion-safe:hover:-translate-y-0.5",
  "hover:border-cyan-400/60",
  "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.11),0_0_0_1px_rgba(34,211,238,0.16),0_12px_36px_-6px_rgba(6,182,212,0.38),0_4px_14px_-2px_rgba(2,6,23,0.55)]",
  "motion-safe:hover:brightness-[1.05]"
);

/** Pressed — micro compress, no layout shift. */
export const SEMANTIC_PRESSED = cn(
  "motion-safe:active:translate-y-0 motion-safe:active:scale-[0.985]",
  "active:brightness-[0.98]"
);

/** Selected — stronger cyan edge illumination. */
export const SEMANTIC_SELECTED =
  "data-[selected=true]:border-cyan-400/65 data-[selected=true]:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.11),0_0_0_1px_rgba(34,211,238,0.24),0_10px_28px_-4px_rgba(6,182,212,0.34)]";

/** Disabled — mute without removing structure. */
export const SEMANTIC_DISABLED =
  "disabled:pointer-events-none disabled:opacity-50 disabled:saturate-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

/** Focus — keyboard-visible cyan ring (WCAG). */
export const SEMANTIC_FOCUS_PREMIUM =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

/** Icon micro-reaction inside group cards — stronger glow, same size. */
export const SEMANTIC_ICON_HOVER = cn(
  SEMANTIC_MOTION_PREMIUM,
  "motion-safe:group-hover:scale-110 motion-safe:group-hover:drop-shadow-[0_0_12px_rgba(34,211,238,0.62)]"
);

/** Icon well glow on group hover. */
export const SEMANTIC_ICON_WELL_HOVER = cn(
  SEMANTIC_MOTION_PREMIUM,
  "motion-safe:group-hover:scale-105",
  "group-hover:border-cyan-400/45 group-hover:bg-cyan-500/15",
  "motion-safe:group-hover:shadow-[0_0_22px_-2px_rgba(34,211,238,0.48)]"
);

/** KPI value emphasis — subtle live feel on hover (primary / revenue). */
export const SEMANTIC_VALUE_HOVER =
  "motion-safe:transition-[filter,opacity] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:group-hover:brightness-125";

/**
 * Executive hover — slightly stronger lift than standard cards,
 * still restrained (no flashy bounce).
 */
export const SEMANTIC_EXECUTIVE_HOVER = cn(
  SEMANTIC_MOTION_PREMIUM,
  "motion-safe:hover:-translate-y-1 motion-safe:hover:scale-[1.015]",
  SEMANTIC_PRESSED
);

export const SEMANTIC_INTERACTION = {
  surface: SEMANTIC_SURFACE_PREMIUM,
  motion: SEMANTIC_MOTION_PREMIUM,
  hover: SEMANTIC_HOVER_PREMIUM,
  pressed: SEMANTIC_PRESSED,
  selected: SEMANTIC_SELECTED,
  disabled: SEMANTIC_DISABLED,
  focus: SEMANTIC_FOCUS_PREMIUM,
  iconHover: SEMANTIC_ICON_HOVER,
  iconWellHover: SEMANTIC_ICON_WELL_HOVER,
  valueHover: SEMANTIC_VALUE_HOVER,
  executiveHover: SEMANTIC_EXECUTIVE_HOVER,
} as const;
