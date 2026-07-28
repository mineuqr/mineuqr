/**
 * SEMANTIC-SECTION-STATE-PLATFORM-1
 * Illustration + action slots — presentation only.
 */
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SemanticStateIllustration({
  icon: Icon,
  tone = "neutral",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone?: "neutral" | "warning" | "destructive" | "success" | "info";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass =
    size === "lg"
      ? "h-16 w-16 rounded-2xl"
      : size === "sm"
        ? "h-10 w-10 rounded-xl"
        : "h-12 w-12 rounded-2xl";
  const iconSize =
    size === "lg" ? "h-8 w-8" : size === "sm" ? "h-5 w-5" : "h-6 w-6";

  const toneClass = {
    neutral: "border-slate-600/40 bg-slate-900/60 text-slate-400",
    warning: "border-orange-500/30 bg-orange-500/10 text-orange-400",
    destructive: "border-destructive/30 bg-destructive/10 text-destructive",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    info: "border-teal-500/30 bg-teal-500/10 text-teal-300",
  }[tone];

  return (
    <div
      data-slot="semantic-state-illustration"
      className={cn(
        "mx-auto mb-3 flex items-center justify-center border",
        sizeClass,
        toneClass,
        className
      )}
    >
      <Icon className={iconSize} aria-hidden />
    </div>
  );
}

export function SemanticStateActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="semantic-state-actions"
      className={cn("mt-4 flex flex-wrap items-center justify-center gap-2", className)}
    >
      {children}
    </div>
  );
}

export function SemanticRetrySlot({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-slot="semantic-retry-slot" className={cn("mt-2", className)}>
      {children}
    </div>
  );
}
