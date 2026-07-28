/**
 * SEMANTIC-STATUS-BADGE-SYSTEM-1
 * Official platform status badge — single implementation for all status chrome.
 */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SEMANTIC_BADGE_FOCUS,
  semanticBadgeShell,
  type SemanticBadgeSize,
} from "../tokens/badgeSurface";
import {
  semanticBadgeDotClass,
  semanticBadgeHoverClass,
  semanticBadgeToneClass,
  type SemanticBadgeDensity,
  type SemanticBadgeTone,
} from "../tokens/badgeTone";

export type SemanticBadgeProps = React.ComponentProps<"span"> & {
  tone?: SemanticBadgeTone;
  density?: SemanticBadgeDensity;
  size?: SemanticBadgeSize;
  /** Show leading status dot */
  showDot?: boolean;
  icon?: LucideIcon;
  /** Numeric count badge */
  count?: number | string;
  compact?: boolean;
  interactive?: boolean;
  disabled?: boolean;
  asChild?: boolean;
};

export function SemanticBadge({
  tone = "neutral",
  density = "soft",
  size = "sm",
  showDot = false,
  icon: Icon,
  count,
  compact = false,
  interactive = false,
  disabled = false,
  asChild = false,
  className,
  children,
  ...props
}: SemanticBadgeProps) {
  const Comp = asChild ? Slot : interactive ? "button" : "span";
  const resolvedTone = disabled ? "disabled" : tone;
  const isCount = count !== undefined;

  return (
    <Comp
      data-slot="semantic-badge"
      data-tone={resolvedTone}
      data-density={density}
      type={interactive && !asChild ? "button" : undefined}
      disabled={interactive ? disabled : undefined}
      aria-disabled={disabled || undefined}
      className={cn(
        semanticBadgeShell(size, { compact, count: isCount }),
        semanticBadgeToneClass(resolvedTone, density),
        interactive && !disabled && SEMANTIC_BADGE_FOCUS,
        interactive && !disabled && semanticBadgeHoverClass(resolvedTone, density),
        interactive && "cursor-pointer",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
      {...props}
    >
      {showDot ? (
        <span
          className={cn("size-1.5 shrink-0 rounded-full", semanticBadgeDotClass(resolvedTone))}
          aria-hidden
        />
      ) : null}
      {Icon ? <Icon aria-hidden /> : null}
      {isCount ? count : children}
    </Comp>
  );
}

/** Named variants — same implementation, fixed defaults (not forks). */

export function StatusBadge(props: SemanticBadgeProps) {
  return <SemanticBadge density="soft" {...props} />;
}

export function OutlineBadge(props: SemanticBadgeProps) {
  return <SemanticBadge density="outline" {...props} />;
}

export function CompactBadge(props: SemanticBadgeProps) {
  return <SemanticBadge compact {...props} />;
}

export function DotBadge({
  tone = "neutral",
  className,
  label,
  ...props
}: Omit<SemanticBadgeProps, "showDot" | "children"> & { label?: string }) {
  return (
    <SemanticBadge
      tone={tone}
      showDot
      density="soft"
      className={className}
      aria-label={label}
      {...props}
    >
      {label}
    </SemanticBadge>
  );
}

export function IconBadge({
  icon,
  ...props
}: SemanticBadgeProps & { icon: LucideIcon }) {
  return <SemanticBadge icon={icon} {...props} />;
}

export function CountBadge({
  count,
  tone = "info",
  ...props
}: Omit<SemanticBadgeProps, "count"> & { count: number | string }) {
  return <SemanticBadge count={count} tone={tone} density="filled" size="sm" {...props} />;
}

export function InteractiveBadge(props: SemanticBadgeProps) {
  return <SemanticBadge interactive {...props} />;
}
